import { NextResponse } from "next/server";
import { z } from "zod";
import { crmAdmin, requireCrmStaff } from "../../_shared";
import { normalizeEmail, normalizeRuPhone } from "@/shared/utils/contacts";

const guardianInputSchema = z.object({
  guardianId: z.string().uuid().optional().nullable(),
  fullName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  relation: z.string().optional().nullable(),
  isPrimary: z.boolean().optional(),
  isBillingContact: z.boolean().optional(),
});

const createStudentSchema = z.object({
  fullName: z.string().min(1),
  birthDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  groupId: z.string().uuid().optional().nullable(),
  guardians: z.array(guardianInputSchema).min(1).max(4),
  allowDuplicate: z.boolean().optional(),
});

function maskPhone(phone: string | null | undefined) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 4) return phone || null;
  return `***${digits.slice(-4)}`;
}

export async function POST(request: Request) {
  const access = await requireCrmStaff();
  if (!access.ok) return access.response;

  const input = createStudentSchema.parse(await request.json());
  const admin = crmAdmin();

  const billingCount = input.guardians.filter((guardian) => guardian.isBillingContact).length;
  if (billingCount !== 1) {
    return NextResponse.json({ ok: false, error: "Выберите ровно одного получателя счетов" }, { status: 400 });
  }

  const guardians = input.guardians.map((guardian, index) => {
    if (!guardian.guardianId && !guardian.fullName?.trim()) {
      throw new Error("Укажите ФИО нового родителя или выберите существующего");
    }
    return {
      guardian_id: guardian.guardianId || null,
      full_name: guardian.fullName?.trim() || null,
      phone: guardian.phone?.trim() || null,
      email: guardian.email?.trim() || null,
      relation: guardian.relation?.trim() || "Родитель",
      is_primary: guardian.isPrimary ?? index === 0,
      is_billing_contact: Boolean(guardian.isBillingContact),
    };
  });

  const duplicateKeys = guardians
    .filter((guardian) => !guardian.guardian_id)
    .flatMap((guardian) => [
      normalizeRuPhone(guardian.phone) ? `phone_normalized.eq.${normalizeRuPhone(guardian.phone)}` : null,
      normalizeEmail(guardian.email) ? `email_normalized.eq.${normalizeEmail(guardian.email)}` : null,
    ])
    .filter(Boolean);

  const warnings: any[] = [];
  if (duplicateKeys.length > 0) {
    const { data: duplicates } = await (admin.from("guardians") as any)
      .select("id, full_name, phone, email")
      .eq("organization_id", access.organizationId)
      .is("deleted_at", null)
      .is("anonymized_at", null)
      .or(duplicateKeys.join(","));
    warnings.push(...(duplicates || []));
    if (warnings.length > 0 && !input.allowDuplicate) {
      return NextResponse.json({
        ok: false,
        code: "DUPLICATE_GUARDIAN_FOUND",
        error: "Найден похожий родитель. Выберите существующего или подтвердите создание отдельной карточки.",
        candidates: warnings.map((item) => ({
          id: item.id,
          fullName: item.full_name,
          maskedPhone: maskPhone(item.phone),
          email: item.email || null,
        })),
      }, { status: 409 });
    }
  }

  const { data, error } = await (admin.rpc("crm_create_student_with_guardians", {
    p_organization_id: access.organizationId,
    p_student: {
      full_name: input.fullName,
      birth_date: input.birthDate || null,
      status: "active",
      notes: input.notes || null,
    },
    p_guardians: guardians,
    p_group_id: input.groupId || null,
  }) as any);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, result: data, warnings });
}
