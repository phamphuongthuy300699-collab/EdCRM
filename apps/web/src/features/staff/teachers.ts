type StaffDirectoryEntry = {
  user_id: string;
  full_name?: string | null;
  role: string;
  is_active: boolean;
};

export function activeTeacherOptions(staff: StaffDirectoryEntry[]) {
  return staff
    .filter((person) => person.role === "teacher" && person.is_active)
    .map((person) => ({ id: person.user_id, full_name: person.full_name || "Без имени" }));
}

export function resolveTeacherName(
  teacherId: string | null | undefined,
  staff: StaffDirectoryEntry[],
  embeddedName?: string | null,
) {
  if (!teacherId) return embeddedName || "Не назначен";
  return staff.find((person) => person.user_id === teacherId)?.full_name || embeddedName || "Не назначен";
}
