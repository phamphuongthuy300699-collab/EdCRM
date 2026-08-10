import { NextResponse } from "next/server";
import { z } from "zod";
import { crmAdmin, requireCrmStaff } from "../_shared";

const readRoles = new Set(["owner", "admin", "accountant", "manager"]);
const writeRoles = new Set(["owner", "admin", "accountant"]);
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("adjust"), guardianId: z.string().uuid(), amount: z.number().refine((value) => value !== 0), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("payroll"), entryId: z.string().uuid(), status: z.enum(["approved", "paid"]) }),
]);

export async function GET(request: Request) {
  const access = await requireCrmStaff(readRoles);
  if (!access.ok) return access.response;
  const admin = crmAdmin();
  const url = new URL(request.url);
  const accountId = url.searchParams.get("accountId");
  const search = url.searchParams.get("q")?.trim().toLowerCase() || "";
  const [{ data: accounts, error: accountError }, { data: payroll, error: payrollError }, { data: problems, error: problemError }] = await Promise.all([
    admin.from("billing_accounts").select("id, guardian_id, balance, updated_at, guardians(full_name, phone, student_guardians(student_id, students(full_name)))").eq("organization_id", access.organizationId).order("updated_at", { ascending: false }),
    admin.from("teacher_payroll_entries").select("id, teacher_id, attendee_count, rate_snapshot, amount, status, created_at, lesson_sessions(lesson_date, starts_at, groups(title)), profiles(full_name)").eq("organization_id", access.organizationId).order("created_at", { ascending: false }).limit(300),
    admin.from("finance_warnings").select("id, warning_type, lesson_session_id, student_id, teacher_id, details, created_at, students(full_name), profiles(full_name), lesson_sessions(lesson_date, groups(title))").eq("organization_id", access.organizationId).is("resolved_at", null).order("created_at", { ascending: false }),
  ]);
  const error = accountError || payrollError || problemError;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  let ledger: any[] = [];
  if (accountId) {
    const account = (accounts || []).find((item: any) => item.id === accountId);
    if (!account) return NextResponse.json({ ok: false, error: "Лицевой счёт не найден" }, { status: 404 });
    const result = await admin.from("billing_ledger_entries").select("id, entry_type, amount, reason, created_at, students(full_name), invoices(number, title), lesson_sessions(lesson_date, groups(title))").eq("organization_id", access.organizationId).eq("account_id", accountId).order("created_at", { ascending: false });
    if (result.error) return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 });
    ledger = result.data || [];
  }
  const filteredAccounts = search ? (accounts || []).filter((account: any) => {
    const guardian = Array.isArray(account.guardians) ? account.guardians[0] : account.guardians;
    const children = (guardian?.student_guardians || []).map((link: any) => (Array.isArray(link.students) ? link.students[0] : link.students)?.full_name).join(" ");
    return `${guardian?.full_name || ""} ${guardian?.phone || ""} ${children}`.toLowerCase().includes(search);
  }) : accounts || [];
  return NextResponse.json({ ok: true, canManage: writeRoles.has(access.role), accounts: filteredAccounts, payroll: payroll || [], problems: problems || [], ledger });
}

export async function POST(request: Request) {
  const access = await requireCrmStaff(writeRoles);
  if (!access.ok) return access.response;
  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Проверьте данные операции" }, { status: 400 });
  const admin = crmAdmin();
  const input = parsed.data;
  const call = input.action === "adjust"
    ? await (admin as any).rpc("apply_billing_adjustment", { p_organization_id: access.organizationId, p_guardian_id: input.guardianId, p_amount: input.amount, p_reason: input.reason, p_actor_id: access.userId })
    : await (admin as any).rpc("transition_teacher_payroll", { p_organization_id: access.organizationId, p_entry_id: input.entryId, p_status: input.status, p_actor_id: access.userId });
  if (call.error) return NextResponse.json({ ok: false, error: call.error.message }, { status: 409 });
  return NextResponse.json({ ok: true, result: call.data });
}
