import { z } from "zod";
import { databaseUuidSchema } from "@/features/scheduling/schemas";

export const teacherRateSchema = z.object({
  teacherId: databaseUuidSchema,
  mode: z.enum(["per_attendee", "per_lesson"]),
  rate: z.number().nonnegative(),
  effectiveFrom: z.string().date(),
}).strict();

const messages: Record<string, string> = {
  teacherId: "Некорректный преподаватель",
  mode: "Некорректная схема оплаты",
  rate: "Некорректная ставка",
  effectiveFrom: "Некорректная дата начала",
};

export function teacherRateValidationPayload(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] || "request");
    fieldErrors[field] = messages[field] || "Некорректные параметры ставки";
  }
  return {
    ok: false as const,
    code: "INVALID_TEACHER_RATE" as const,
    error: Object.values(fieldErrors)[0] || "Некорректные параметры ставки",
    fieldErrors,
  };
}
