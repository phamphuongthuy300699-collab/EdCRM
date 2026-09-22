import { z } from "zod";
import { databaseUuidSchema } from "@/features/scheduling/schemas";
import { trialSubjectSchema } from "./contracts";

export const teacherTrialSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("existing"), participant: trialSubjectSchema }).strict(),
  z.object({
    kind: z.literal("new"),
    requestId: databaseUuidSchema,
    childName: z.string().trim().min(2).max(150),
    parentName: z.string().trim().max(150).default(""),
    parentPhone: z.string().trim().max(40).default(""),
  }).strict(),
]);
