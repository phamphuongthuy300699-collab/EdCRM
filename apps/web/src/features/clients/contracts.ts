import { z } from "zod";

export const guardianLifecycle = z.enum(["prospect", "active", "inactive", "do_not_contact", "archived"]);
export const studentLifecycle = z.enum(["prospect", "active", "paused", "inactive", "archived"]);

export const guardianSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().trim().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  status: guardianLifecycle.default("prospect"),
  source: z.string().trim().optional().nullable(),
  tags: z.array(z.string().trim().min(1)).max(20).default([]),
  interestNotes: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  responsibleManagerId: z.string().uuid().optional().nullable(),
  allowDuplicate: z.boolean().default(false),
}).strict();

export const interactionSchema = z.object({
  guardianId: z.string().uuid().optional().nullable(),
  studentId: z.string().uuid().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  type: z.enum(["call", "message", "email", "telegram", "max", "comment", "meeting"]),
  result: z.enum(["answered", "no_answer", "interested", "scheduled_trial", "thinking", "rejected", "paid"]).optional().nullable(),
  summary: z.string().trim().optional().nullable(),
  nextActionAt: z.string().datetime().optional().nullable(),
  completeInteractionId: z.string().uuid().optional().nullable(),
}).refine((value) => value.guardianId || value.studentId || value.leadId, "interaction_subject_required");
