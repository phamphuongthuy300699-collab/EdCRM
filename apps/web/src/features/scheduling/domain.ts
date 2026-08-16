export type AttendanceStatus = "unmarked" | "present" | "late" | "absent_excused" | "absent_unexcused";
export type MakeupStatus = "requested" | "approved" | "scheduled" | "completed" | "cancelled";
export type LessonSessionStatus = "planned" | "live" | "completed" | "cancelled" | "moved";
export type ScheduleNotificationKey = "lesson_scheduled" | "lesson_rescheduled" | "lesson_cancelled" | "makeup_scheduled" | "attendance_absent";

export type ConcreteLessonSession = {
  id: string;
  groupId: string;
  startsAt: string;
  status: LessonSessionStatus;
  rescheduledFromSessionId?: string | null;
  [key: string]: unknown;
};

export type ScheduleRule = { id: string; weekday: number; startsAt: string; endsAt: string };
export type ScheduleView = "all" | "teacher" | "group";

export function groupOperationalSessions<T extends { startsAt: string; teacherId?: string | null; teacherName?: string | null; groupId?: string | null; groupName?: string | null }>(sessions: T[], view: ScheduleView) {
  const sorted = [...sessions].sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
  if (view === "all") return [{ key: "all", label: "Все занятия", sessions: sorted }];
  const groups = new Map<string, { key: string; label: string; sessions: T[] }>();
  for (const session of sorted) {
    const key = view === "teacher" ? session.teacherId || "unassigned" : session.groupId || "unassigned";
    const label = view === "teacher" ? session.teacherName || "Преподаватель не назначен" : session.groupName || "Без группы";
    const bucket = groups.get(key) || { key, label, sessions: [] };
    bucket.sessions.push(session);
    groups.set(key, bucket);
  }
  return [...groups.values()].sort((left, right) => left.label.localeCompare(right.label, "ru"));
}

const attendanceLabels: Record<AttendanceStatus, string> = {
  unmarked: "Не отмечено",
  present: "Присутствовал",
  late: "Опоздал",
  absent_excused: "Пропуск по уважительной причине",
  absent_unexcused: "Пропуск без уважительной причины",
};

export function attendanceStatusLabel(status: AttendanceStatus) {
  return attendanceLabels[status];
}

export function markAllPresent<T extends { status: AttendanceStatus }>(rows: T[]) {
  return rows.map((row) => ({ ...row, status: "present" as const }));
}

export function allAttendanceMarked(rows: Array<{ status: AttendanceStatus }>) {
  return rows.every((row) => row.status !== "unmarked");
}

export function attendanceCompletionState(rows: Array<{ status: AttendanceStatus; pendingAbsence?: boolean }>) {
  const remaining = rows.filter((row) => row.status === "unmarked" || row.pendingAbsence).length;
  return {
    complete: remaining === 0,
    remaining,
    pendingAbsence: rows.some((row) => row.pendingAbsence),
    message: remaining > 0
      ? `Чтобы завершить занятие, отметьте ещё ${remaining} ${remaining === 1 ? "ученика" : "учеников"}.`
      : "",
  };
}

export function eligibleForMakeup(input: { attendanceStatus: AttendanceStatus; makeupStatus: MakeupStatus | null }) {
  return input.attendanceStatus === "absent_excused" && !input.makeupStatus;
}

export function concreteSessionsForStudent<T extends ConcreteLessonSession>(sessions: T[]) {
  const replacedIds = new Set(sessions.map((session) => session.rescheduledFromSessionId).filter(Boolean));
  return [...sessions]
    .filter((session) => session.status !== "cancelled" && !(session.status === "moved" && replacedIds.has(session.id)))
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
}

function formatDateTime(value: unknown) {
  const date = new Date(String(value || ""));
  if (!Number.isFinite(date.getTime())) return "время уточняется";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function buildScheduleNotificationText(templateKey: ScheduleNotificationKey, payload: Record<string, unknown>) {
  const child = String(payload.childName || "Ребёнок");
  const group = String(payload.groupTitle || "группа");
  const startsAt = formatDateTime(payload.startsAt);
  const reason = payload.reason ? ` Причина: ${String(payload.reason)}.` : "";

  if (templateKey === "lesson_scheduled") {
    return `Робокс: ${child}, добавлено занятие ${startsAt}. Группа: ${group}.${reason}`;
  }
  if (templateKey === "lesson_rescheduled") {
    return `Робокс: ${child}, занятие перенесено с ${formatDateTime(payload.oldStartsAt)} на ${startsAt}. Группа: ${group}.${reason}`;
  }
  if (templateKey === "lesson_cancelled") {
    return `Робокс: ${child}, занятие ${startsAt} отменено. Группа: ${group}.${reason}`;
  }
  if (templateKey === "makeup_scheduled") {
    return `Робокс: ${child}, отработка назначена на ${startsAt}. Группа: ${group}.`;
  }
  return `Робокс: ${child} отмечен как отсутствующий на занятии ${startsAt}. Группа: ${group}.${reason}`;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function materializeRuleOccurrences(rules: ScheduleRule[], dateFrom: string, dateTo: string) {
  const cursor = new Date(`${dateFrom}T00:00:00Z`);
  const end = new Date(`${dateTo}T00:00:00Z`);
  const result: Array<{ scheduleRuleId: string; lessonDate: string; startsAt: string; endsAt: string }> = [];
  while (cursor <= end) {
    const weekday = cursor.getUTCDay() === 0 ? 7 : cursor.getUTCDay();
    const lessonDate = isoDate(cursor);
    for (const rule of rules.filter((item) => item.weekday === weekday)) {
      result.push({
        scheduleRuleId: rule.id,
        lessonDate,
        startsAt: new Date(`${lessonDate}T${rule.startsAt}+03:00`).toISOString(),
        endsAt: new Date(`${lessonDate}T${rule.endsAt}+03:00`).toISOString(),
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result.sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}
