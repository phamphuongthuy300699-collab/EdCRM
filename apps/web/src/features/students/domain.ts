export type StudentEnrollmentState = {
  status?: string | null;
  groupId?: string | null;
  group_id?: string | null;
};

export type StudentOperationalInput = {
  status?: string | null;
  enrollments?: StudentEnrollmentState[] | null;
};

export type NormalizedStudentStatus = "active" | "paused" | "archived";

export function studentOperationalState(student: StudentOperationalInput) {
  const known = student.status === "active" || student.status === "paused" || student.status === "archived";
  const status: NormalizedStudentStatus = known ? student.status as NormalizedStudentStatus : "active";
  const activeEnrollments = (student.enrollments || []).filter((enrollment) => enrollment.status === "active");
  return {
    status,
    activeEnrollments,
    withoutGroup: status === "active" && activeEnrollments.length === 0,
    wasLegacyStatus: !known,
  };
}

export function summarizeStudents(students: StudentOperationalInput[]) {
  return students.reduce((summary, student) => {
    const state = studentOperationalState(student);
    summary.total += 1;
    summary[state.status] += 1;
    summary.activeEnrollments += state.activeEnrollments.length;
    if (state.withoutGroup) summary.withoutGroup += 1;
    return summary;
  }, { total: 0, active: 0, withoutGroup: 0, paused: 0, archived: 0, activeEnrollments: 0 });
}

function searchable(value: unknown) {
  return String(value || "").toLocaleLowerCase("ru-RU").replace(/\s+/g, " ").trim();
}

function digits(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

export function matchesStudentSearch(student: {
  fullName?: string | null;
  full_name?: string | null;
  guardians?: Array<{ fullName?: string | null; full_name?: string | null; phone?: string | null }> | null;
}, query: string) {
  const normalizedQuery = searchable(query);
  if (!normalizedQuery) return true;
  const phoneQuery = digits(query);
  const text = [student.fullName, student.full_name, ...(student.guardians || []).flatMap((guardian) => [guardian.fullName, guardian.full_name])]
    .map(searchable)
    .join(" ");
  if (text.includes(normalizedQuery)) return true;
  return phoneQuery.length >= 3 && (student.guardians || []).some((guardian) => digits(guardian.phone).includes(phoneQuery));
}
