import { NextResponse } from "next/server";
import { z } from "zod";
import { crmAdmin, requireCrmStaff } from "../_shared";
import { normalizeEmail, normalizeRuPhone } from "@/shared/utils/contacts";

const relationFields = {
  relation: z.string().trim().min(1).default("Родитель"),
  isPrimary: z.boolean().default(false),
  isBillingContact: z.boolean().default(false),
};
const schema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("link").default("link"), studentId: z.string().uuid(), guardianId: z.string().uuid(), ...relationFields }).strict(),
  z.object({ mode: z.literal("createGuardian"), studentId: z.string().uuid(), guardian: z.object({ fullName: z.string().trim().min(1), phone: z.string().optional(), email: z.string().optional() }).strict(), allowDuplicate: z.boolean().default(false), ...relationFields }).strict(),
  z.object({ mode: z.literal("createStudent"), guardianId: z.string().uuid(), student: z.object({ fullName: z.string().trim().min(1), birthDate: z.string().optional().nullable(), notes: z.string().optional().nullable() }).strict(), ...relationFields }).strict(),
]);

export async function POST(request: Request) {
  const access = await requireCrmStaff(new Set(["owner", "admin", "manager"]));
  if (!access.ok) return access.response;
  const input = schema.parse(await request.json());
  const admin = crmAdmin();

  let result;
  if (input.mode === "createGuardian") {
    const phone = normalizeRuPhone(input.guardian.phone);
    const email = normalizeEmail(input.guardian.email);
    const filters = [phone ? `phone_normalized.eq.${phone}` : null, email ? `email_normalized.eq.${email}` : null].filter(Boolean);
    if (filters.length && !input.allowDuplicate) {
      const { data: duplicate } = await (admin.from("guardians") as any).select("id,full_name").eq("organization_id", access.organizationId).is("deleted_at", null).or(filters.join(",")).limit(1).maybeSingle();
      if (duplicate) return NextResponse.json({ ok: false, code: "DUPLICATE_GUARDIAN_FOUND", error: `Найден похожий родитель: ${duplicate.full_name}`, candidate: duplicate }, { status: 409 });
    }
    result = await (admin.rpc("crm_create_guardian_and_link_student", {
      p_organization_id: access.organizationId,
      p_student_id: input.studentId,
      p_guardian: { full_name: input.guardian.fullName, phone: input.guardian.phone || null, email: input.guardian.email || null, status: "prospect", source: "manual" },
      p_relation: input.relation,
      p_is_primary: input.isPrimary,
      p_is_billing_contact: input.isBillingContact,
    }) as any);
  } else if (input.mode === "createStudent") {
    result = await (admin.rpc("crm_create_student_with_guardians", {
      p_organization_id: access.organizationId,
      p_student: { full_name: input.student.fullName, birth_date: input.student.birthDate || null, notes: input.student.notes || null, status: "prospect" },
      p_guardians: [{ guardian_id: input.guardianId, relation: input.relation, is_primary: input.isPrimary, is_billing_contact: input.isBillingContact }],
      p_group_id: null,
    }) as any);
  } else {
    result = await (admin.rpc("crm_link_student_guardian", {
      p_organization_id: access.organizationId,
      p_student_id: input.studentId,
      p_guardian_id: input.guardianId,
      p_relation: input.relation,
      p_is_primary: input.isPrimary,
      p_is_billing_contact: input.isBillingContact,
    }) as any);
  }

  if (result.error) return NextResponse.json({ ok: false, error: result.error.message }, { status: result.error.message.includes("already_exists") ? 409 : 400 });
  return NextResponse.json({ ok: true, result: result.data });
}
