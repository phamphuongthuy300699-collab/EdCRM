import { NextResponse } from "next/server";
import { crmAdmin, requireCrmStaff } from "../_shared";

const dashboardRoles = new Set(["owner", "admin", "manager", "accountant"]);

function related<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

export async function GET() {
  const access = await requireCrmStaff(dashboardRoles);
  if (!access.ok) return access.response;
  const admin = crmAdmin();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const todayStart = new Date(`${today}T00:00:00+03:00`).toISOString();
  const tomorrowStart = new Date(new Date(todayStart).getTime() + 86400000).toISOString();
  const monthStart = `${today.slice(0, 7)}-01`;

  const core = await Promise.all([
    admin.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", access.organizationId).eq("status", "new"),
    admin.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", access.organizationId).eq("status", "new").gte("created_at", todayStart).lt("created_at", tomorrowStart),
    admin.from("invoices").select("id", { count: "exact", head: true }).eq("organization_id", access.organizationId).eq("status", "overdue"),
    admin.from("invoices").select("amount").eq("organization_id", access.organizationId).eq("status", "overdue"),
    admin.from("students").select("id, status").eq("organization_id", access.organizationId).eq("status", "active"),
    admin.from("groups").select("id, capacity").eq("organization_id", access.organizationId).eq("status", "active"),
    admin.from("enrollments").select("id, group_id, student_id").eq("organization_id", access.organizationId).eq("status", "active"),
    admin.from("lesson_sessions").select("id, group_id, starts_at, ends_at, status, session_kind").eq("organization_id", access.organizationId).eq("lesson_date", today).in("status", ["planned", "live", "completed", "cancelled", "moved"]).order("starts_at"),
    admin.from("billing_accounts").select("balance").eq("organization_id", access.organizationId).lt("balance", 0),
    admin.from("teacher_payroll_entries").select("amount, lesson_sessions!inner(lesson_date)").eq("organization_id", access.organizationId).gte("lesson_sessions.lesson_date", monthStart).lte("lesson_sessions.lesson_date", today),
  ]);
  const coreError = core.find((result) => result.error)?.error;
  if (coreError) {
    console.error("[crm/dashboard] core metrics load failed", coreError);
    return NextResponse.json({ ok: false, error: "Не удалось загрузить данные рабочего стола" }, { status: 500 });
  }

  const [newLeadsCountResult, newLeadsTodayResult, overdueCountResult, overdueAmountResult, studentsResult, groupsResult, enrollmentsResult, sessionsResult, debtResult, payrollResult] = core;
  const optional = await Promise.all([
    admin.from("leads").select("id, parent_name, parent_phone, child_name, status, created_at, courses(title)").eq("organization_id", access.organizationId).eq("status", "new").order("created_at", { ascending: false }).limit(3),
    admin.from("invoices").select("id, title, amount, status, due_date, students(full_name, student_guardians(guardians(full_name)))").eq("organization_id", access.organizationId).eq("status", "overdue").order("due_date", { ascending: true }).limit(3),
    admin.from("lesson_sessions").select("id, group_id, starts_at, ends_at, status, session_kind, groups(title, capacity), profiles(full_name), rooms(name)").eq("organization_id", access.organizationId).eq("lesson_date", today).in("status", ["planned", "live", "completed", "cancelled", "moved"]).order("starts_at"),
  ]);
  const diagnostics: string[] = [];
  const optionalCodes = ["RECENT_LEADS_UNAVAILABLE", "RECENT_INVOICES_UNAVAILABLE", "SESSION_DETAILS_UNAVAILABLE"];
  optional.forEach((result, index) => {
    if (result.error) {
      diagnostics.push(optionalCodes[index]);
      console.error(`[crm/dashboard] ${optionalCodes[index]}`, result.error);
    }
  });
  const [recentLeadsResult, recentInvoicesResult, detailedSessionsResult] = optional;

  const enrollmentsByGroup = new Map<string, number>();
  for (const enrollment of enrollmentsResult.data || []) enrollmentsByGroup.set(enrollment.group_id, (enrollmentsByGroup.get(enrollment.group_id) || 0) + 1);
  const activeStudentIds = new Set((studentsResult.data || []).map((student: any) => student.id));
  for (const enrollment of enrollmentsResult.data || []) activeStudentIds.delete(enrollment.student_id);
  const groups = groupsResult.data || [];
  const sessions = sessionsResult.data || [];

  return NextResponse.json({
    ok: true,
    partial: diagnostics.length > 0,
    diagnostics,
    today,
    stats: {
      newLeadsCount: newLeadsCountResult.count || 0,
      newLeadsToday: newLeadsTodayResult.count || 0,
      overdueAmount: (overdueAmountResult.data || []).reduce((sum: number, invoice: any) => sum + Number(invoice.amount || 0), 0),
      overdueCount: overdueCountResult.count || 0,
      activeGroupsCount: groups.length,
      activeStudentsCount: (studentsResult.data || []).length,
      withoutGroup: activeStudentIds.size,
      totalCapacity: groups.reduce((sum: number, group: any) => sum + Number(group.capacity || 0), 0),
      enrolledCount: (enrollmentsResult.data || []).length,
      todayCompleted: sessions.filter((session: any) => session.status === "completed").length,
      todayRemaining: sessions.filter((session: any) => session.status === "planned" || session.status === "live").length,
      parentDebt: (debtResult.data || []).reduce((sum: number, account: any) => sum + Math.abs(Number(account.balance || 0)), 0),
      monthPayroll: (payrollResult.data || []).reduce((sum: number, payroll: any) => sum + Number(payroll.amount || 0), 0),
    },
    leads: recentLeadsResult.error ? [] : (recentLeadsResult.data || []).map((lead: any) => ({ id: lead.id, name: lead.parent_name || "Без имени", phone: lead.parent_phone || "", child: lead.child_name || "Не указан", course: related<any>(lead.courses)?.title || "Не указан", date: new Date(lead.created_at).toLocaleString("ru-RU", { timeZone: "Europe/Moscow", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }), status: lead.status })),
    invoices: recentInvoicesResult.error ? [] : (recentInvoicesResult.data || []).map((invoice: any) => { const student = related<any>(invoice.students); const link = related<any>(student?.student_guardians); return { id: invoice.id, student: student?.full_name || "Неизвестно", parent: related<any>(link?.guardians)?.full_name || "Не указан", amount: `${Number(invoice.amount || 0).toLocaleString("ru-RU")} ₽`, due: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("ru-RU") : "Не установлен" }; }),
    sessions: detailedSessionsResult.error ? [] : (detailedSessionsResult.data || []).map((session: any) => { const group = related<any>(session.groups); return { id: session.id, startsAt: session.starts_at, endsAt: session.ends_at, time: `${new Date(session.starts_at).toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" })}–${new Date(session.ends_at).toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" })}`, name: group?.title || "Без группы", room: related<any>(session.rooms)?.name || "Кабинет не назначен", teacher: related<any>(session.profiles)?.full_name || "Преподаватель не назначен", status: session.status, kind: session.session_kind || "regular", filled: `${enrollmentsByGroup.get(session.group_id) || 0}/${Number(group?.capacity || 0)} мест` }; }),
  });
}
