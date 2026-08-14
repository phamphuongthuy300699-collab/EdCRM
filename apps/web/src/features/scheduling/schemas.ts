import { z } from "zod";

export const databaseUuidSchema = z.string().regex(
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
);

const scheduleRuleSchema = z.object({
  weekday: z.number().int().min(1).max(7),
  starts_at: z.string(),
  ends_at: z.string(),
});

export const scheduleActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save_group"),
    groupId: databaseUuidSchema.nullable().optional(),
    group: z.object({
      title: z.string().min(1).max(200),
      courseId: databaseUuidSchema,
      branchId: databaseUuidSchema.nullable().optional(),
      roomId: databaseUuidSchema.nullable().optional(),
      teacherId: databaseUuidSchema.nullable().optional(),
      status: z.enum(["draft", "active", "paused", "closed"]).optional(),
      ageFrom: z.number().int().min(0).max(100).nullable().optional(),
      ageTo: z.number().int().min(0).max(100).nullable().optional(),
      capacity: z.number().int().positive().max(1000).optional(),
      startsOn: z.string().nullable().optional(),
      endsOn: z.string().nullable().optional(),
      priceMonthly: z.number().nonnegative().nullable().optional(),
      billingEnabled: z.boolean().optional(),
      lessonPrice: z.number().positive().nullable().optional(),
      chargeAbsentExcused: z.boolean().optional(),
      chargeAbsentUnexcused: z.boolean().optional(),
      showOnSite: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }),
    rules: z.array(scheduleRuleSchema).optional(),
    rebuildFuture: z.boolean().default(true),
  }),
  z.object({
    action: z.literal("replace_group_rules"),
    groupId: databaseUuidSchema,
    rules: z.array(scheduleRuleSchema),
    rebuildFuture: z.boolean().default(true),
  }),
  z.object({ action: z.literal("materialize"), groupId: databaseUuidSchema, dateFrom: z.string(), dateTo: z.string() }),
  z.object({
    action: z.literal("create_session"),
    groupId: databaseUuidSchema,
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    kind: z.enum(["regular", "extra", "trial"]).default("extra"),
    topic: z.string().max(500).optional(),
    reason: z.string().max(500).optional(),
    notifyGuardians: z.boolean().default(true),
  }),
  z.object({ action: z.literal("reschedule"), sessionId: databaseUuidSchema, startsAt: z.string().datetime(), endsAt: z.string().datetime().nullable().optional(), reason: z.string().min(1).max(500), notifyGuardians: z.boolean().default(true) }),
  z.object({ action: z.literal("cancel"), sessionId: databaseUuidSchema, reason: z.string().min(1).max(500), notifyGuardians: z.boolean().default(true) }),
  z.object({ action: z.literal("schedule_makeup"), makeupAssignmentId: databaseUuidSchema, targetSessionId: databaseUuidSchema, notes: z.string().max(500).optional() }),
  z.object({ action: z.literal("start_session"), sessionId: databaseUuidSchema }),
  z.object({ action: z.literal("complete_session"), sessionId: databaseUuidSchema }),
  z.object({
    action: z.literal("save_attendance"),
    sessionId: databaseUuidSchema,
    records: z.array(z.object({ studentId: databaseUuidSchema, status: z.enum(["unmarked", "present", "late", "absent_excused", "absent_unexcused"]), comment: z.string().max(1000).optional(), absenceReason: z.string().max(500).optional() })),
  }),
]);

const validationMessages: Record<string, string> = {
  groupId: "Некорректная группа",
  "group.title": "Укажите название группы",
  "group.courseId": "Некорректный курс",
  "group.branchId": "Некорректный филиал",
  "group.roomId": "Некорректный кабинет",
  "group.teacherId": "Некорректный преподаватель",
  "group.status": "Некорректный статус группы",
  "group.capacity": "Некорректная вместимость",
  "group.lessonPrice": "Некорректная цена занятия",
  rules: "Некорректное расписание",
  sessionId: "Некорректное занятие",
  makeupAssignmentId: "Некорректная отработка",
  targetSessionId: "Некорректное занятие для отработки",
  "records.studentId": "Некорректный ученик",
};

export function scheduleValidationPayload(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".");
    const normalizedField = field.replace(/\.\d+\./g, ".");
    fieldErrors[field || "operation"] = validationMessages[normalizedField]
      || validationMessages[issue.path.at(-1)?.toString() || ""]
      || "Некорректное значение";
  }
  return {
    ok: false as const,
    code: "INVALID_SCHEDULE_OPERATION" as const,
    error: Object.values(fieldErrors)[0] || "Некорректные данные операции расписания",
    fieldErrors,
  };
}
