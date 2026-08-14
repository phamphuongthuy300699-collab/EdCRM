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

export function parseScheduleText(scheduleText: string): { weekday: number; starts_at: string; ends_at: string }[] {
  const normalized = scheduleText.trim();
  if (!normalized || normalized.toLowerCase() === "не задано") return [];

  const timeMatch = normalized.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
  if (!timeMatch) throw new Error("Некорректный формат расписания");
  const time = timeMatch[0];
  const starts_at = `${time}:00`;
  const [hours, minutes] = time.split(":").map(Number);
  const endHours = String((hours + 1) % 24).padStart(2, "0");
  const ends_at = `${endHours}:${String(minutes).padStart(2, "0")}:00`;
  const text = normalized.toLowerCase();
  const rules = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"]
    .flatMap((day, index) => text.includes(day) ? [{ weekday: index + 1, starts_at, ends_at }] : []);

  if (!rules.length) throw new Error("Некорректный формат расписания");
  return rules;
}
