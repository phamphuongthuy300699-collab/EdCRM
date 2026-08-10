import { NextResponse } from "next/server";
import { crmAdmin, requireCrmStaff } from "../../crm/_shared";

const roles = new Set(["teacher"]);

export async function GET() {
  const access = await requireCrmStaff(roles);
  if (!access.ok) return access.response;
  const admin = crmAdmin();
  const { data, error } = await admin.from("teacher_payroll_entries")
    .select("id, attendee_count, rate_snapshot, amount, status, created_at, lesson_sessions(lesson_date, starts_at, groups(title))")
    .eq("organization_id", access.organizationId).eq("teacher_id", access.userId).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, payroll: data || [] });
}
