import { z } from "zod";
import { databaseUuidSchema } from "./schemas";

export const assignHomeworkSchema = z.object({
  homeworkTemplateId: databaseUuidSchema,
  dueAt: z.string().date().nullable().optional(),
}).strict();
