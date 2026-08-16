import { NextResponse } from "next/server";
import { buildManagementReport } from "@/lib/reports/management";
import { DEFAULT_ORGANIZATION_TIMEZONE, localDate, timestampBounds } from "@/lib/reports/date-range";
import { buildReportScope, hasOrganizationalFilter, reportFilters } from "@/lib/reports/report-scope";
import { crmAdmin, requireCrmStaff } from "../_shared";
import { loadPayrollTeacherNames } from "@/lib/finance/payroll-teachers";

const roles = new Set(["owner", "admin", "accountant", "manager"]);
const related = (value: any) => Array.isArray(value) ? value[0] : value;

export async function GET(request: Request) {
  const access = await requireCrmStaff(roles);
  if (!access.ok) return access.response;
  const admin = crmAdmin() as any;
  const { searchParams } = new URL(request.url);
  const filters = reportFilters(searchParams);

  const { data: organization } = await admin.from("organizations").select("timezone").eq("id", access.organizationId).maybeSingle();
  const timezone = organization?.timezone || DEFAULT_ORGANIZATION_TIMEZONE;
  const today = localDate(new Date(), timezone);
  const dateFrom = searchParams.get("dateFrom") || today;
  const dateTo = searchParams.get("dateTo") || today;
  const bounds = timestampBounds(dateFrom, dateTo, timezone);

  let scope;
  try {
    scope = await buildReportScope(admin, access.organizationId, filters, dateFrom, dateTo);
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  const { groups, enrollments, scopedStudentIds, sessions, sessionIds } = scope;
  const scoped = hasOrganizationalFilter(filters);

  let studentsQuery = admin.from("students").select("id, status, created_at").eq("organization_id", access.organizationId).or("status.eq.active,status.is.null");
  if (scoped) {
    studentsQuery = scopedStudentIds.length ? studentsQuery.in("id", scopedStudentIds) : studentsQuery.in("id", ["00000000-0000-0000-0000-000000000000"]);
  }

  const [studentsResult, allStudentsResult, branchesResult, coursesResult, teachersResult, accountsResult] = await Promise.all([
    studentsQuery,
    admin.from("students").select("id, status, created_at").eq("organization_id", access.organizationId).or("status.eq.active,status.is.null"),
    admin.from("branches").select("id, name").eq("organization_id", access.organizationId).eq("is_active", true).order("name"),
    admin.from("courses").select("id, title").eq("organization_id", access.organizationId).order("title"),
    admin.from("org_memberships").select("user_id, profiles(full_name)").eq("organization_id", access.organizationId).eq("role", "teacher").eq("is_active", true),
    admin.from("billing_accounts").select("id, guardian_id, balance, guardians(full_name, student_guardians(students(full_name)))").eq("organization_id", access.organizationId).lt("balance", 0).order("balance", { ascending: true }),
  ]);
  const firstError = [studentsResult, allStudentsResult, branchesResult, coursesResult, teachersResult, accountsResult].find((result) => result.error)?.error;
  if (firstError) return NextResponse.json({ ok: false, error: firstError.message }, { status: 500 });

  const [attendanceResult, paymentsResult, ledgerResult, payrollResult] = await Promise.all([
    sessionIds.length
      ? admin.from("attendance").select("student_id, group_id, attendance_status, students(full_name), groups(title)").eq("organization_id", access.organizationId).in("lesson_session_id", sessionIds)
      : Promise.resolve({ data: [], error: null }),
    admin.from("payments").select("id, amount, status").eq("organization_id", access.organizationId).in("status", ["paid", "succeeded"]).gte("paid_at", bounds.from).lte("paid_at", bounds.to),
    sessionIds.length
      ? admin.from("billing_ledger_entries").select("entry_type, amount, lesson_session_id, lesson_sessions(group_id)").eq("organization_id", access.organizationId).eq("entry_type", "lesson_debit").in("lesson_session_id", sessionIds)
      : Promise.resolve({ data: [], error: null }),
    sessionIds.length
      ? admin.from("teacher_payroll_entries").select("teacher_id, lesson_session_id, attendee_count, amount, status, lesson_sessions(group_id)").eq("organization_id", access.organizationId).in("lesson_session_id", sessionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const dataError = [attendanceResult, paymentsResult, ledgerResult, payrollResult].find((result) => result.error)?.error;
  if (dataError) return NextResponse.json({ ok: false, error: dataError.message }, { status: 500 });
  let payrollTeacherNames: Map<string, string>;
  try {
    payrollTeacherNames = await loadPayrollTeacherNames(admin, access.organizationId, (payrollResult.data || []).map((entry: any) => entry.teacher_id));
  } catch (teacherError) {
    console.error("[crm/reports] payroll teacher lookup failed", teacherError);
    return NextResponse.json({ ok: false, error: "Не удалось загрузить начисления для отчёта" }, { status: 500 });
  }

  const namedGroups = groups.map((group: any) => ({ ...group, teacher_name: related(group.profiles)?.full_name }));
  const report = buildManagementReport({
    students: studentsResult.data || [], groups: namedGroups, enrollments, sessions,
    attendance: (attendanceResult.data || []).map((row: any) => ({ student_id: row.student_id, student_name: related(row.students)?.full_name, group_id: row.group_id, group_title: related(row.groups)?.title, status: row.attendance_status })),
    payments: paymentsResult.data || [],
    ledger: (ledgerResult.data || []).map((entry: any) => ({ ...entry, group_id: related(entry.lesson_sessions)?.group_id || null })),
    accounts: accountsResult.data || [],
    payroll: (payrollResult.data || []).map((entry: any) => ({ ...entry, teacher_name: payrollTeacherNames.get(entry.teacher_id) || "Преподаватель", group_id: related(entry.lesson_sessions)?.group_id || null })),
    dateFrom: bounds.from, dateTo: bounds.to,
  });

  const allActiveIds = new Set((allStudentsResult.data || []).map((student: any) => student.id));
  const { data: allEnrollments, error: allEnrollmentError } = await admin.from("enrollments").select("student_id").eq("organization_id", access.organizationId).eq("status", "active");
  if (allEnrollmentError) return NextResponse.json({ ok: false, error: allEnrollmentError.message }, { status: 500 });
  const allEnrolledIds = new Set((allEnrollments || []).map((row: any) => row.student_id));
  const organizationWithoutGroup = [...allActiveIds].filter((id) => !allEnrolledIds.has(id)).length;

  const accountIds = (accountsResult.data || []).map((account: any) => account.id);
  const { data: debtLedger, error: debtError } = accountIds.length
    ? await admin.from("billing_ledger_entries").select("account_id, entry_type, created_at").eq("organization_id", access.organizationId).in("account_id", accountIds).in("entry_type", ["payment", "lesson_debit"]).order("created_at", { ascending: false })
    : { data: [], error: null };
  if (debtError) return NextResponse.json({ ok: false, error: debtError.message }, { status: 500 });
  const debtRows = (accountsResult.data || []).map((account: any) => {
    const guardian = related(account.guardians);
    const children = (guardian?.student_guardians || []).map((link: any) => related(link.students)?.full_name).filter(Boolean).join(", ");
    return {
      accountId: account.id, guardian: guardian?.full_name || "Родитель", children, balance: account.balance,
      lastPayment: (debtLedger || []).find((entry: any) => entry.account_id === account.id && entry.entry_type === "payment")?.created_at || null,
      lastDebit: (debtLedger || []).find((entry: any) => entry.account_id === account.id && entry.entry_type === "lesson_debit")?.created_at || null,
    };
  });

  return NextResponse.json({
    ok: true, dateFrom, dateTo, timezone,
    scope: { filtered: scoped, organizationWide: ["cash", "debt", "withoutGroup"], organizationWithoutGroup },
    report: { ...report, students: { ...report.students, withoutGroup: organizationWithoutGroup }, debtRows },
    directories: {
      branches: branchesResult.data || [], courses: coursesResult.data || [],
      groups: namedGroups.map((group: any) => ({ id: group.id, title: group.title })),
      teachers: (teachersResult.data || []).map((teacher: any) => ({ id: teacher.user_id, name: related(teacher.profiles)?.full_name || "Преподаватель" })),
    },
  });
}
