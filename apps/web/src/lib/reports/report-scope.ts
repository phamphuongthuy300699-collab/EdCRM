export type ReportFilters = {
  branchId: string | null;
  courseId: string | null;
  groupId: string | null;
  teacherId: string | null;
};

export function reportFilters(searchParams: URLSearchParams): ReportFilters {
  return {
    branchId: searchParams.get("branchId"),
    courseId: searchParams.get("courseId"),
    groupId: searchParams.get("groupId"),
    teacherId: searchParams.get("teacherId"),
  };
}

export function hasOrganizationalFilter(filters: ReportFilters) {
  return Boolean(filters.branchId || filters.courseId || filters.groupId || filters.teacherId);
}

export async function buildReportScope(admin: any, organizationId: string, filters: ReportFilters, dateFrom: string, dateTo: string) {
  let groupsQuery = admin.from("groups")
    .select("id, title, status, capacity, teacher_id, branch_id, course_id, profiles(full_name)")
    .eq("organization_id", organizationId);
  if (filters.branchId) groupsQuery = groupsQuery.eq("branch_id", filters.branchId);
  if (filters.courseId) groupsQuery = groupsQuery.eq("course_id", filters.courseId);
  if (filters.groupId) groupsQuery = groupsQuery.eq("id", filters.groupId);
  if (filters.teacherId) groupsQuery = groupsQuery.eq("teacher_id", filters.teacherId);
  const groupsResult = await groupsQuery;
  if (groupsResult.error) throw groupsResult.error;

  const groups = groupsResult.data || [];
  const groupIds = groups.map((group: any) => group.id);
  if (!groupIds.length) return { groups, groupIds, enrollments: [], scopedStudentIds: [], sessions: [], sessionIds: [] };

  const [enrollmentResult, sessionResult] = await Promise.all([
    admin.from("enrollments").select("student_id, group_id, status").eq("organization_id", organizationId).eq("status", "active").in("group_id", groupIds),
    (() => {
      let query = admin.from("lesson_sessions").select("id, group_id, teacher_id, status, rescheduled_from_session_id")
        .eq("organization_id", organizationId).gte("lesson_date", dateFrom).lte("lesson_date", dateTo).in("group_id", groupIds);
      if (filters.teacherId) query = query.eq("teacher_id", filters.teacherId);
      return query;
    })(),
  ]);
  if (enrollmentResult.error) throw enrollmentResult.error;
  if (sessionResult.error) throw sessionResult.error;
  const enrollments = enrollmentResult.data || [];
  const sessions = sessionResult.data || [];
  return {
    groups,
    groupIds,
    enrollments,
    scopedStudentIds: [...new Set(enrollments.map((row: any) => row.student_id).filter(Boolean))],
    sessions,
    sessionIds: sessions.map((session: any) => session.id),
  };
}
