export const groupStatuses = ["active", "draft", "paused", "closed"] as const;
export type GroupStatus = (typeof groupStatuses)[number];

export function normalizeGroupStatus(value: unknown): GroupStatus {
  return groupStatuses.includes(value as GroupStatus) ? value as GroupStatus : "active";
}

const groupStatusLabels: Record<GroupStatus, string> = {
  active: "Активна",
  draft: "Черновик",
  paused: "Приостановлена",
  closed: "Закрыта",
};

export function groupStatusLabel(status: unknown, archived = false): string {
  if (archived) return "Архив";
  return groupStatusLabels[normalizeGroupStatus(status)];
}

export function countActiveGroups(groups: Array<{ status?: unknown; archivedAt?: unknown }>): number {
  return groups.filter((group) => !group.archivedAt && group.status === "active").length;
}

type EditableScheduleRule = { weekday: number; starts_at: string; ends_at: string };
const weekdaysRu = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function formatScheduleRules(rules: EditableScheduleRule[]): string {
  if (!rules?.length) return "Не задано";
  const byTime = new Map<string, number[]>();
  for (const rule of [...rules].sort((a, b) => a.weekday - b.weekday || a.starts_at.localeCompare(b.starts_at))) {
    const range = `${rule.starts_at.slice(0, 5)}–${rule.ends_at.slice(0, 5)}`;
    byTime.set(range, [...(byTime.get(range) || []), rule.weekday]);
  }
  return [...byTime].map(([range, days]) => `${days.map(day => weekdaysRu[day - 1]).join(" / ")} ${range}`).join(", ");
}

export function parseScheduleText(scheduleText: string): EditableScheduleRule[] {
  const normalized = scheduleText.trim();
  if (!normalized || normalized.toLowerCase() === "не задано") return [];
  const invalid = () => new Error("Некорректный формат расписания. Пример: Ср 18:00–19:00, Сб 11:30–13:00");
  const rules: EditableScheduleRule[] = [];
  for (const segment of normalized.split(/[,;\n]/)) {
    const match = segment.trim().match(/^((?:пн|вт|ср|чт|пт|сб|вс)(?:\s*\/\s*(?:пн|вт|ср|чт|пт|сб|вс))*)\s+([01]\d|2[0-3]):([0-5]\d)(?:\s*[-–—]\s*([01]\d|2[0-3]):([0-5]\d))?$/i);
    if (!match) throw invalid();
    const startMinutes = Number(match[2]) * 60 + Number(match[3]);
    const endMinutes = match[4] === undefined ? startMinutes + 60 : Number(match[4]) * 60 + Number(match[5]);
    if (endMinutes <= startMinutes || endMinutes >= 1440) throw invalid();
    const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
    for (const day of match[1].toLowerCase().split(/\s*\/\s*/)) {
      const weekday = weekdaysRu.findIndex(value => value.toLowerCase() === day) + 1;
      const rule = { weekday, starts_at: clock(startMinutes), ends_at: clock(endMinutes) };
      if (rules.some(existing => existing.weekday === weekday && existing.starts_at < rule.ends_at && existing.ends_at > rule.starts_at)) throw invalid();
      rules.push(rule);
    }
  }
  return rules.sort((a, b) => a.weekday - b.weekday || a.starts_at.localeCompare(b.starts_at));
}
