import { NextResponse } from "next/server";
import { buildManagementReport } from "@/lib/reports/management";
import { crmAdmin, requireCrmStaff } from "../_shared";

const roles = new Set(["owner", "admin", "accountant", "manager"]);
const related = (value: any) => Array.isArray(value) ? value[0] : value;

export async function GET(request: Request) {
  const access = await requireCrmStaff(roles);
  if (!access.ok) return access.response;
  const admin = crmAdmin() as any;
  const { searchParams } = new URL(request.url);
  const today = new Date().toISOString().slice(0, 10);
  const dateFrom = searchParams.get("dateFrom") || today;
  const dateTo = searchParams.get("dateTo") || today;
  const branchId = searchParams.get("branchId");
  const courseId = searchParams.get("courseId");
  const groupId = searchParams.get("groupId");
  const teacherId = searchParams.get("teacherId");

  let groupsQuery = admin.from("groups")
    .select("id, title, status, capacity, teacher_id, branch_id, course_id, profiles(full_name)")
    .eq("organization_id", access.organizationId);
  if (branchId) groupsQuery = groupsQuery.eq("branch_id", branchId);
  if (courseId) groupsQuery = groupsQuery.eq("course_id", courseId);
  if (groupId) groupsQuery = groupsQuery.eq("id", groupId);
  if (teacherId) groupsQuery = groupsQuery.eq("teacher_id", teacherId);

  const [groupsResult, studentsResult, branchesResult, coursesResult, teachersResult, accountsResult] = await Promise.all([
    groupsQuery,
    admin.from("students").select("id, status, created_at").eq("organization_id", access.organizationId).or("status.eq.active,status.is.null"),
    admin.from("branches").select("id, name").eq("organization_id", access.organizationId).eq("is_active", true).order("name"),
    admin.from("courses").select("id, title").eq("organization_id", access.organizationId).order("title"),
    admin.from("org_memberships").select("user_id, profiles(full_name)").eq("organization_id", access.organizationId).eq("role", "teacher").eq("is_active", true),
    admin.from("billing_accounts").select("id, guardian_id, balance, guardians(full_name, student_guardians(students(full_name)))").eq("organization_id", access.organizationId).lt("balance", 0).order("balance", { ascending: true }),
  ]);
  const firstError = [groupsResult, studentsResult, branchesResult, coursesResult, teachersResult, accountsResult].find((result) => result.error)?.error;
  if (firstError) return NextResponse.json({ ok: false, error: firstError.message }, { status: 500 });

  const groups = (groupsResult.data || []).map((group: any) => ({ ...group, teacher_name: related(group.profiles)?.full_name }));
  const groupIds = groups.map((group: any) => group.id);
  let enrollments: any[] = [];
  let sessions: any[] = [];
  if (groupIds.length) {
    const enrollmentResult = await admin.from("enrollments").select("student_id, group_id, status").eq("organization_id", access.organizationId).eq("status", "active").in("group_id", groupIds);
    if (enrollmentResult.error) return NextResponse.json({ ok: false, error: enrollmentResult.error.message }, { status: 500 });
    enrollments = enrollmentResult.data || [];
    let sessionsQuery = admin.from("lesson_sessions").select("id, group_id, teacher_id, status, rescheduled_from_session_id").eq("organization_id", access.organizationId).gte("lesson_date", dateFrom).lte("lesson_date", dateTo).in("group_id", groupIds);
    if (teacherId) sessionsQuery = sessionsQuery.eq("teacher_id", teacherId);
    const sessionResult = await sessionsQuery;
    if (sessionResult.error) return NextResponse.json({ ok: false, error: sessionResult.error.message }, { status: 500 });
    sessions = sessionResult.data || [];
  }
  const sessionIds = sessions.map((session: any) => session.id);

  const [attendanceResult, paymentsResult, ledgerResult, payrollResult] = await Promise.all([
    sessionIds.length
      ? admin.from("attendance").select("student_id, group_id, attendance_status, students(full_name), groups(title)").eq("organization_id", access.organizationId).in("lesson_session_id", sessionIds)
      : Promise.resolve({ data: [], error: null }),
    admin.from("payments").select("id, amount, status").eq("organization_id", access.organizationId).in("status", ["paid", "succeeded"]).gte("paid_at", `${dateFrom}T00:00:00.000Z`).lte("paid_at", `${dateTo}T23:59:59.999Z`),
    admin.from("billing_ledger_entries").select("entry_type, amount, lesson_sessions(group_id)").eq("organization_id", access.organizationId).gte("created_at", `${dateFrom}T00:00:00.000Z`).lte("created_at", `${dateTo}T23:59:59.999Z`),
    sessionIds.length
      ? admin.from("teacher_payroll_entries").select("teacher_id, lesson_session_id, attendee_count, amount, status, profiles(full_name), lesson_sessions(group_id)").eq("organization_id", access.organizationId).in("lesson_session_id", sessionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const dataError = [attendanceResult, paymentsResult, ledgerResult, payrollResult].find((result) => result.error)?.error;
  if (dataError) return NextResponse.json({ ok: false, error: dataError.message }, { status: 500 });

  const report = buildManagementReport({
    students: studentsResult.data || [], groups, enrollments, sessions,
    attendance: (attendanceResult.data || []).map((row: any) => ({ student_id: row.student_id, student_name: related(row.students)?.full_name, group_id: row.group_id, group_title: related(row.groups)?.title, status: row.attendance_status })),
    payments: paymentsResult.data || [],
    ledger: (ledgerResult.data || []).map((entry: any) => ({ ...entry, group_id: related(entry.lesson_sessions)?.group_id || null })),
    accounts: accountsResult.data || [],
    payroll: (payrollResult.data || []).map((entry: any) => ({ ...entry, teacher_name: related(entry.profiles)?.full_name, group_id: related(entry.lesson_sessions)?.group_id || null })),
    dateFrom, dateTo,
  });

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
    ok: true, dateFrom, dateTo, report: { ...report, debtRows },
    directories: {
      branches: branchesResult.data || [], courses: coursesResult.data || [],
      groups: groups.map((group: any) => ({ id: group.id, title: group.title })),
      teachers: (teachersResult.data || []).map((teacher: any) => ({ id: teacher.user_id, name: related(teacher.profiles)?.full_name || "Преподаватель" })),
    },
  });
}
