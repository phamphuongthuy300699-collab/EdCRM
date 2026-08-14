import { NextResponse } from "next/server";
import { z } from "zod";
import { crmAdmin, requireCrmStaff } from "../_shared";
import { writeSecurityAudit } from "@/lib/security/audit";

const readRoles = new Set(["owner", "admin", "accountant", "manager"]);
const writeRoles = new Set(["owner", "admin", "accountant"]);
const pageSizeSchema = z.coerce.number().int().min(5).max(100).catch(25);
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("adjust"), guardianId: z.string().uuid(), amount: z.number().refine((value) => value !== 0), reason: z.string().trim().min(3).max(500) }).strict(),
  z.object({ action: z.literal("payroll"), entryId: z.string().uuid(), status: z.enum(["approved", "paid"]) }).strict(),
  z.object({ action: z.literal("payrollPeriod"), teacherId: z.string().uuid(), month: z.string().date(), status: z.enum(["approved", "paid"]) }).strict(),
]);

const paged = (items: any[] | null, count: number | null, page: number, pageSize: number) => ({
  items: items || [], page, pageSize, total: count || 0, hasMore: page * pageSize < (count || 0),
});

async function matchingGuardianIds(admin: any, organizationId: string, search: string) {
  if (!search) return null;
  const safe = search.replaceAll(",", " ").trim();
  const [{ data: guardians, error: guardianError }, { data: students, error: studentError }] = await Promise.all([
    admin.from("guardians").select("id").eq("organization_id", organizationId).or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%,phone_normalized.ilike.%${safe}%`),
    admin.from("students").select("id").eq("organization_id", organizationId).ilike("full_name", `%${safe}%`),
  ]);
  if (guardianError || studentError) throw guardianError || studentError;
  const ids = new Set<string>((guardians || []).map((item: any) => item.id));
  if (students?.length) {
    const { data: links, error } = await admin.from("student_guardians").select("guardian_id").eq("organization_id", organizationId).in("student_id", students.map((item: any) => item.id));
    if (error) throw error;
    for (const link of links || []) ids.add(link.guardian_id);
  }
  return [...ids];
}

export async function GET(request: Request) {
  const access = await requireCrmStaff(readRoles);
  if (!access.ok) return access.response;
  const admin = crmAdmin() as any;
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") || "accounts";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = pageSizeSchema.parse(searchParams.get("pageSize") || 25);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const teacherId = searchParams.get("teacherId");
  const groupId = searchParams.get("groupId");
  const status = searchParams.get("status");
  const canManage = writeRoles.has(access.role);

  try {
    if (view === "accounts") {
      const guardianIds = await matchingGuardianIds(admin, access.organizationId, searchParams.get("q")?.trim() || "");
      if (guardianIds && guardianIds.length === 0) return NextResponse.json({ ok: true, canManage, view, ...paged([], 0, page, pageSize) });
      let query = admin.from("billing_accounts")
        .select("id, guardian_id, balance, updated_at, guardians(full_name, phone, student_guardians(student_id, students(full_name)))", { count: "exact" })
        .eq("organization_id", access.organizationId)
        .order("updated_at", { ascending: false });
      if (guardianIds) query = query.in("guardian_id", guardianIds);
      const { data, count, error } = await query.range(from, to);
      if (error) throw error;
      return NextResponse.json({ ok: true, canManage, view, ...paged(data, count, page, pageSize) });
    }

    if (view === "ledger") {
      const accountId = z.string().uuid().parse(searchParams.get("accountId"));
      const { data: account } = await admin.from("billing_accounts").select("id").eq("organization_id", access.organizationId).eq("id", accountId).maybeSingle();
      if (!account) return NextResponse.json({ ok: false, error: "Лицевой счёт не найден" }, { status: 404 });
      let query = admin.from("billing_ledger_entries")
        .select("id, entry_type, amount, reason, created_at, students(full_name), invoices(number, title), lesson_sessions(lesson_date, groups(title))", { count: "exact" })
        .eq("organization_id", access.organizationId).eq("account_id", accountId).order("created_at", { ascending: false });
      if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00.000Z`);
      if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59.999Z`);
      const { data, count, error } = await query.range(from, to);
      if (error) throw error;
      return NextResponse.json({ ok: true, canManage, view, ...paged(data, count, page, pageSize) });
    }

    if (view === "payroll") {
      const month = searchParams.get("month") || new Date().toISOString().slice(0, 7) + "-01";
      let query = admin.from("teacher_payroll_entries")
        .select("id, teacher_id, pay_mode, attendee_count, rate_snapshot, amount, status, created_at, lesson_sessions!inner(lesson_date, starts_at, group_id, groups(title)), profiles(full_name)", { count: "exact" })
        .eq("organization_id", access.organizationId).order("created_at", { ascending: false });
      if (dateFrom) query = query.gte("lesson_sessions.lesson_date", dateFrom);
      if (dateTo) query = query.lte("lesson_sessions.lesson_date", dateTo);
      if (teacherId) query = query.eq("teacher_id", teacherId);
      if (groupId) query = query.eq("lesson_sessions.group_id", groupId);
      if (status) query = query.eq("status", status);
      const [{ data, count, error }, summaryCall] = await Promise.all([
        query.range(from, to),
        admin.rpc("finance_payroll_month_summary", { p_organization_id: access.organizationId, p_month: month }),
      ]);
      if (error || summaryCall.error) throw error || summaryCall.error;
      return NextResponse.json({ ok: true, canManage, view, summary: summaryCall.data || [], ...paged(data, count, page, pageSize) });
    }

    if (view === "warnings") {
      let query = admin.from("finance_warnings")
        .select("id, warning_type, lesson_session_id, student_id, teacher_id, details, resolved_at, created_at, students(full_name), profiles(full_name), lesson_sessions(lesson_date, group_id, groups(title))", { count: "exact" })
        .eq("organization_id", access.organizationId).order("created_at", { ascending: false });
      if (status !== "history") query = query.is("resolved_at", null);
      if (status === "history") query = query.not("resolved_at", "is", null);
      const warningType = searchParams.get("warningType");
      if (warningType) query = query.eq("warning_type", warningType);
      const { data, count, error } = await query.range(from, to);
      if (error) throw error;
      return NextResponse.json({ ok: true, canManage, view, ...paged(data, count, page, pageSize) });
    }

    if (view === "reconciliation") {
      const summaryCall = await admin.rpc("finance_cutover_summary", { p_organization_id: access.organizationId });
      if (summaryCall.error) throw summaryCall.error;
      const { data: payments, count, error } = await admin.from("payments")
        .select("id, amount, paid_at, status, provider, invoices(number, title), guardians(full_name)", { count: "exact" })
        .eq("organization_id", access.organizationId).in("status", ["paid", "succeeded"])
        .order("paid_at", { ascending: false, nullsFirst: false }).range(from, to);
      if (error) throw error;
      const paymentIds = (payments || []).map((payment: any) => payment.id);
      const { data: reflected, error: ledgerError } = paymentIds.length
        ? await admin.from("billing_ledger_entries").select("payment_id").eq("organization_id", access.organizationId).eq("entry_type", "payment").in("payment_id", paymentIds)
        : { data: [], error: null };
      if (ledgerError) throw ledgerError;
      const reflectedIds = new Set((reflected || []).map((entry: any) => entry.payment_id));
      const items = (payments || []).map((payment: any) => ({ ...payment, reflected: reflectedIds.has(payment.id) }));
      return NextResponse.json({ ok: true, canManage, view, summary: summaryCall.data, ...paged(items, count, page, pageSize) });
    }

    return NextResponse.json({ ok: false, error: "Неизвестный финансовый раздел" }, { status: 400 });
  } catch (cause) {
    return NextResponse.json({ ok: false, error: (cause as Error).message || "Не удалось загрузить финансы" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await requireCrmStaff(writeRoles);
  if (!access.ok) return access.response;
  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Проверьте данные операции" }, { status: 400 });
  const admin = crmAdmin() as any;
  const input = parsed.data;
  const call = input.action === "adjust"
    ? await admin.rpc("apply_billing_adjustment", { p_organization_id: access.organizationId, p_guardian_id: input.guardianId, p_amount: input.amount, p_reason: input.reason, p_actor_id: access.staffProfileId })
    : input.action === "payroll"
      ? await admin.rpc("transition_teacher_payroll", { p_organization_id: access.organizationId, p_entry_id: input.entryId, p_status: input.status, p_actor_id: access.staffProfileId })
      : await admin.rpc("transition_teacher_payroll_period", { p_organization_id: access.organizationId, p_teacher_id: input.teacherId, p_month: input.month, p_status: input.status, p_actor_id: access.staffProfileId });
  if (call.error) return NextResponse.json({ ok: false, error: call.error.message }, { status: 409 });
  await writeSecurityAudit(admin, {
    organizationId: access.organizationId,
    actorId: access.staffProfileId,
    action: input.action === "adjust" ? "billing_manual_adjustment" : "teacher_payroll_transition",
    entityTable: input.action === "adjust" ? "billing_accounts" : "teacher_payroll_entries",
    entityId: input.action === "adjust" ? input.guardianId : input.action === "payroll" ? input.entryId : input.teacherId,
    metadata: input.action === "adjust"
      ? { amount: input.amount }
      : { status: input.status, scope: input.action === "payrollPeriod" ? "period" : "entry" },
  });
  return NextResponse.json({ ok: true, result: call.data });
}
