import { NextResponse } from "next/server";
import { csvResponse } from "@/lib/finance/csv";
import { DEFAULT_ORGANIZATION_TIMEZONE, localDate } from "@/lib/reports/date-range";
import { buildReportScope, reportFilters } from "@/lib/reports/report-scope";
import { crmAdmin, requireCrmStaff } from "../../_shared";

const roles = new Set(["owner", "admin", "accountant", "manager"]);
const related = (value: any) => Array.isArray(value) ? value[0] : value;

export async function GET(request: Request) {
  const access = await requireCrmStaff(roles);
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const filters = reportFilters(searchParams);
  const { branchId, courseId, groupId, teacherId } = filters;
  const admin = crmAdmin() as any;
  const { data: organization } = await admin.from("organizations").select("timezone").eq("id", access.organizationId).maybeSingle();
  const timezone = organization?.timezone || DEFAULT_ORGANIZATION_TIMEZONE;
  const today = localDate(new Date(), timezone);
  const dateFrom = searchParams.get("dateFrom") || today;
  const dateTo = searchParams.get("dateTo") || today;
  const dateText = (value: string | null) => value ? new Date(value).toLocaleDateString("ru-RU", { timeZone: timezone }) : "";

  if (type === "attendance" || type === "payroll") {
    let scope;
    try {
      scope = await buildReportScope(admin, access.organizationId, { branchId, courseId, groupId, teacherId }, dateFrom, dateTo);
    } catch (error: any) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    const ids = scope.sessionIds;

    if (type === "attendance") {
      const { data, error } = ids.length
        ? await admin.from("attendance").select("attendance_status, lesson_date, students(full_name), groups(title), lesson_sessions(profiles(full_name))").eq("organization_id", access.organizationId).in("lesson_session_id", ids).order("lesson_date")
        : { data: [], error: null };
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return csvResponse("attendance.csv", ["Дата", "Ученик", "Группа", "Преподаватель", "Статус"], (data || []).map((row: any) => [
        row.lesson_date, related(row.students)?.full_name || "", related(row.groups)?.title || "", related(related(row.lesson_sessions)?.profiles)?.full_name || "", row.attendance_status,
      ]));
    }

    const { data, error } = ids.length
      ? await admin.from("teacher_payroll_entries").select("attendee_count, rate_snapshot, amount, status, profiles(full_name), lesson_sessions!inner(id, lesson_date, groups(title))").eq("organization_id", access.organizationId).in("lesson_session_id", ids).order("created_at")
      : { data: [], error: null };
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return csvResponse("payroll.csv", ["Преподаватель", "Дата", "Группа", "Посетили", "Ставка", "Начислено", "Статус"], (data || []).map((row: any) => [
      related(row.profiles)?.full_name || "", related(row.lesson_sessions)?.lesson_date || "", related(related(row.lesson_sessions)?.groups)?.title || "", row.attendee_count, row.rate_snapshot, row.amount, row.status,
    ]));
  }

  if (type === "debt") {
    const { data: accounts, error } = await admin.from("billing_accounts").select("id, balance, guardians(full_name, student_guardians(students(full_name)))").eq("organization_id", access.organizationId).lt("balance", 0).order("balance", { ascending: true });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    const ids = (accounts || []).map((account: any) => account.id);
    const { data: ledger, error: ledgerError } = ids.length
      ? await admin.from("billing_ledger_entries").select("account_id, entry_type, created_at").eq("organization_id", access.organizationId).in("account_id", ids).in("entry_type", ["payment", "lesson_debit"]).order("created_at", { ascending: false })
      : { data: [], error: null };
    if (ledgerError) return NextResponse.json({ ok: false, error: ledgerError.message }, { status: 500 });
    const response = csvResponse("debt-organization-wide.csv", ["Родитель", "Дети", "Баланс", "Последняя оплата", "Последнее списание", "Область"], (accounts || []).map((account: any) => {
      const guardian = related(account.guardians);
      const children = (guardian?.student_guardians || []).map((link: any) => related(link.students)?.full_name).filter(Boolean).join(", ");
      return [guardian?.full_name || "", children, account.balance, dateText((ledger || []).find((entry: any) => entry.account_id === account.id && entry.entry_type === "payment")?.created_at || null), dateText((ledger || []).find((entry: any) => entry.account_id === account.id && entry.entry_type === "lesson_debit")?.created_at || null), "Вся организация"];
    }));
    response.headers.set("X-Report-Scope", "organization-wide");
    return response;
  }

  return NextResponse.json({ ok: false, error: "Неизвестный экспорт" }, { status: 400 });
}
