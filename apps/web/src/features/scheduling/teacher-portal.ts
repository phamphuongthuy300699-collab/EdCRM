export type TeacherPortalSession = {
  id: string;
  starts_at: string;
  status: string;
  [key: string]: unknown;
};

function moscowDateKey(value: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function mergeTeacherScheduleSessions<T extends TeacherPortalSession>(
  calendarSessions: T[],
  unfinishedSessions: T[],
): T[] {
  const byId = new Map(calendarSessions.map((session) => [session.id, session]));
  for (const session of unfinishedSessions) byId.set(session.id, session);
  return [...byId.values()].sort((left, right) => left.starts_at.localeCompare(right.starts_at));
}

export function categorizeTeacherSessions<T extends TeacherPortalSession>(sessions: T[], today = moscowDateKey(new Date())) {
  const visible = sessions.filter((session) => session.status !== "cancelled" && session.status !== "moved");
  const unfinished = visible.filter((session) => session.status === "live");
  const todaySessions = visible.filter((session) => moscowDateKey(session.starts_at) === today);
  const upcoming = visible.filter((session) => session.status === "planned" && moscowDateKey(session.starts_at) > today);
  const history = visible
    .filter((session) => session.status === "completed" && moscowDateKey(session.starts_at) < today)
    .sort((left, right) => right.starts_at.localeCompare(left.starts_at));
  return { unfinished, today: todaySessions, upcoming, history };
}

export function teacherPortalDateRange(today = new Date(), historyDays = 90) {
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - historyDays);
  const to = new Date(today);
  to.setUTCDate(to.getUTCDate() + 30);
  return { dateFrom: moscowDateKey(from), dateTo: moscowDateKey(to) };
}
