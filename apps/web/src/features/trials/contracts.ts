import { z } from "zod";
import { databaseUuidSchema } from "@/features/scheduling/schemas";

export const trialSubjectSchema = z.union([
  z.object({ leadId: databaseUuidSchema }).strict(),
  z.object({ studentId: databaseUuidSchema }).strict(),
]);

const participantBatchSchema = z
  .array(trialSubjectSchema)
  .min(1)
  .max(50)
  .superRefine((participants, context) => {
    const keys = participants.map((participant) =>
      "leadId" in participant
        ? `lead:${participant.leadId}`
        : `student:${participant.studentId}`,
    );
    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: "custom",
        message: "Один участник добавлен несколько раз",
      });
    }
  });

const attachedTrialSchema = z
  .object({
    mode: z.literal("attached_session"),
    lessonSessionId: databaseUuidSchema,
    participants: participantBatchSchema,
  })
  .strict();

const standaloneTrialSchema = z
  .object({
    mode: z.literal("standalone"),
    teacherId: databaseUuidSchema,
    branchId: databaseUuidSchema,
    roomId: databaseUuidSchema.nullable().optional(),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    participants: participantBatchSchema,
  })
  .strict()
  .refine(
    ({ startsAt, endsAt }) =>
      new Date(endsAt).getTime() > new Date(startsAt).getTime(),
    { path: ["endsAt"], message: "Окончание должно быть позже начала" },
  );

export const trialCreateSchema = z.union([
  attachedTrialSchema,
  standaloneTrialSchema,
]);

export const trialParticipantStatusSchema = z.enum([
  "scheduled",
  "attended",
  "no_show",
  "cancelled",
]);
export const trialParticipantResultSchema = z.enum([
  "interested",
  "not_interested",
  "enrolled",
  "not_enrolled",
]);

export const trialParticipantUpdateSchema = z
  .object({
    status: trialParticipantStatusSchema,
    result: trialParticipantResultSchema.nullable().default(null),
    resultComment: z.string().trim().max(2000).nullable().default(null),
  })
  .strict();

export const trialEventChangeSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("cancel"),
      reason: z.string().trim().min(1).max(1000),
    })
    .strict(),
  z
    .object({
      action: z.literal("update"),
      teacherId: databaseUuidSchema,
      branchId: databaseUuidSchema,
      roomId: databaseUuidSchema.nullable().optional(),
      startsAt: z.string().datetime({ offset: true }),
      endsAt: z.string().datetime({ offset: true }),
    })
    .strict()
    .refine(
      ({ startsAt, endsAt }) =>
        new Date(endsAt).getTime() > new Date(startsAt).getTime(),
      { path: ["endsAt"], message: "Окончание должно быть позже начала" },
    ),
]);

export type TrialSubjectInput = z.infer<typeof trialSubjectSchema>;
export type TrialCreateInput = z.infer<typeof trialCreateSchema>;
export type TrialParticipantStatus = z.infer<
  typeof trialParticipantStatusSchema
>;
export type TrialParticipantResult = z.infer<
  typeof trialParticipantResultSchema
>;
export type TrialParticipantUpdateInput = z.infer<
  typeof trialParticipantUpdateSchema
>;

export type TrialParticipantDto = {
  id: string;
  eventId: string;
  leadId: string | null;
  studentId: string | null;
  subjectName: string;
  subjectKind: "lead" | "student";
  status: TrialParticipantStatus;
  result: TrialParticipantResult | null;
  resultComment: string | null;
};
