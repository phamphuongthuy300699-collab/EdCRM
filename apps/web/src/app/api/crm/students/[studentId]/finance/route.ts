import { NextResponse } from "next/server";
import { crmAdmin, requireCrmStaff } from "../../../_shared";

const roles = new Set(["owner", "admin", "accountant", "manager"]);

export async function GET(_: Request, context: { params: Promise<{ studentId: string }> }) {
  const access = await requireCrmStaff(roles);
  if (!access.ok) return access.response;
  const { studentId } = await context.params;
  const admin = crmAdmin();
  const { data: billingLink, error } = await admin.from("student_guardians").select("guardian_id, guardians(full_name)")
    .eq("organization_id", access.organizationId).eq("student_id", studentId).eq("is_billing_contact", true).maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!billingLink) return NextResponse.json({ ok: true, account: null, problem: "Не выбран плательщик" });
  const { data: account } = await admin.from("billing_accounts").select("id, balance, updated_at").eq("organization_id", access.organizationId).eq("guardian_id", billingLink.guardian_id).maybeSingle();
  return NextResponse.json({ ok: true, guardian: billingLink.guardians, account: account || { balance: 0, pending: true } });
}
