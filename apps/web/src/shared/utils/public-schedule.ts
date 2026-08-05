const shortDays: Record<number, string> = {
  1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб", 7: "Вс",
};

type ScheduleRule = { weekday?: number | null; starts_at?: string | null; ends_at?: string | null };

export function formatPublicScheduleRules(rules: ScheduleRule[] | null | undefined): string[] {
  return [...(rules || [])]
    .filter((rule) => rule.weekday && rule.starts_at)
    .sort((left, right) => Number(left.weekday) - Number(right.weekday) || String(left.starts_at).localeCompare(String(right.starts_at)))
    .map((rule) => {
      const start = String(rule.starts_at).slice(0, 5);
      const end = rule.ends_at ? `–${String(rule.ends_at).slice(0, 5)}` : "";
      return `${shortDays[Number(rule.weekday)] || ""} ${start}${end}`.trim();
    });
}

export function formatNearestLesson(startsAt: string | null | undefined): string {
  if (!startsAt) return "";
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "";
  const formatted = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `Ближайшее занятие: ${formatted.replace(" в ", ", ")}`;
}

export function nearestLessonsByGroup(sessions: Array<{ group_id: string; starts_at: string }> | null | undefined) {
  const result = new Map<string, string>();
  for (const session of sessions || []) {
    if (!result.has(session.group_id)) result.set(session.group_id, session.starts_at);
  }
  return result;
}
