export const groupStatuses = ["active", "draft", "paused", "closed"] as const;
export type GroupStatus = (typeof groupStatuses)[number];

export function normalizeGroupStatus(value: unknown): GroupStatus {
  return groupStatuses.includes(value as GroupStatus) ? value as GroupStatus : "active";
}

export function parseScheduleText(scheduleText: string): { weekday: number; starts_at: string; ends_at: string }[] {
  const timeMatch = scheduleText.match(/(\d{2}):(\d{2})/);
  const time = timeMatch ? timeMatch[0] : "18:00";
  const starts_at = `${time}:00`;
  const [hours, minutes] = time.split(":").map(Number);
  const endHours = String((hours + 1) % 24).padStart(2, "0");
  const ends_at = `${endHours}:${String(minutes).padStart(2, "0")}:00`;
  const text = scheduleText.toLowerCase();
  const rules = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"]
    .flatMap((day, index) => text.includes(day) ? [{ weekday: index + 1, starts_at, ends_at }] : []);

  return rules.length ? rules : [{ weekday: 1, starts_at, ends_at }];
}
