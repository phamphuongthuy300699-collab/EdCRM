export const maxEventDefinitions = [
  { key: "invoice_payment_link", label: "Счёт и ссылка на оплату", receiver: "Родитель по счёту", example: "Выставлен счёт и доступна ссылка на оплату" },
  { key: "lesson_scheduled", label: "Новое занятие", receiver: "Родители группы", example: "Добавлено дополнительное занятие" },
  { key: "lesson_rescheduled", label: "Перенос занятия", receiver: "Родители группы", example: "Новая дата, старое время и причина" },
  { key: "lesson_cancelled", label: "Отмена занятия", receiver: "Родители группы", example: "Дата занятия и причина отмены" },
  { key: "attendance_absent", label: "Пропуск", receiver: "Родители ребёнка", example: "Ребёнок отсутствовал на занятии" },
  { key: "makeup_scheduled", label: "Назначена отработка", receiver: "Родители ребёнка", example: "Дата и группа для отработки" },
  { key: "self_service_schedule", label: "Расписание по запросу", receiver: "Родитель в MAX", example: "Расписание детей на ближайшие 7 дней" },
] as const;

export type MaxEventKey = typeof maxEventDefinitions[number]["key"];
export type MaxEventSettings = Record<MaxEventKey, boolean>;

export function normalizeMaxEvents(value: unknown): MaxEventSettings {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(maxEventDefinitions.map((event) => [event.key, source[event.key] !== false])) as MaxEventSettings;
}

export function isMaxEventEnabled(settings: unknown, event: MaxEventKey): boolean {
  const root = settings && typeof settings === "object" ? settings as Record<string, unknown> : {};
  return normalizeMaxEvents(root.events)[event];
}
