import { NextResponse } from "next/server";
import { z } from "zod";
import { crmAdmin, requireCrmStaff } from "../../_shared";

const mergeSchema = z.object({
  masterGuardianId: z.string().uuid(),
  duplicateGuardianId: z.string().uuid(),
  confirmation: z.string().optional(),
  previewOnly: z.boolean().optional(),
});

async function buildPreview(admin: any, organizationId: string, duplicateGuardianId: string) {
  const tables = [
    ["student_guardians", "guardian_id"],
    ["invoices", "guardian_id"],
    ["payments", "guardian_id"],
    ["discount_assignments", "guardian_id"],
    ["guardian_users", "guardian_id"],
    ["guardian_messenger_accounts", "guardian_id"],
    ["notification_outbox", "guardian_id"],
    ["invoice_payment_links", "guardian_id"],
    ["leads", "converted_guardian_id"],
  ];
  const counts: Record<string, number> = {};
  for (const [table, column] of tables) {
    const { count } = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq(column, duplicateGuardianId);
    counts[table] = count || 0;
  }
  return counts;
}

export async function POST(request: Request) {
  const access = await requireCrmStaff(new Set(["owner", "admin"]));
  if (!access.ok) return access.response;

  const input = mergeSchema.parse(await request.json());
  if (input.masterGuardianId === input.duplicateGuardianId) {
    return NextResponse.json({ ok: false, error: "Нельзя объединить родителя с самим собой" }, { status: 400 });
  }

  const admin = crmAdmin();
  const { data: guardians, error: guardiansError } = await (admin.from("guardians") as any)
    .select("id, organization_id")
    .eq("organization_id", access.organizationId)
    .in("id", [input.masterGuardianId, input.duplicateGuardianId]);

  if (guardiansError) {
    return NextResponse.json({ ok: false, error: guardiansError.message }, { status: 500 });
  }
  if ((guardians || []).length !== 2) {
    return NextResponse.json({ ok: false, error: "Родители не найдены в вашей организации" }, { status: 404 });
  }

  const preview = await buildPreview(admin, access.organizationId, input.duplicateGuardianId);
  if (input.previewOnly) return NextResponse.json({ ok: true, preview });

  if (input.confirmation !== "ОБЪЕДИНИТЬ") {
    return NextResponse.json({ ok: false, error: "Введите ОБЪЕДИНИТЬ для подтверждения" }, { status: 400 });
  }

  const { data, error } = await (admin.rpc("crm_merge_guardians", {
    p_organization_id: access.organizationId,
    p_master_guardian_id: input.masterGuardianId,
    p_duplicate_guardian_id: input.duplicateGuardianId,
    p_actor_id: access.userId === "demo-user" ? null : access.userId,
  }) as any);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, result: data, preview });
}
