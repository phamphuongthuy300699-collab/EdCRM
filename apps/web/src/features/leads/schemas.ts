import { z } from "zod";

export const createPublicLeadSchema = z.object({
  parentName: z.string().min(2).max(120),
  parentPhone: z.string().min(7).max(30),
  parentEmail: z.string().email().optional().or(z.literal("")),
  childName: z.string().max(120).optional().nullable(),
  childAge: z.coerce.number().int().min(3).max(18).optional().nullable(),
  courseId: z.string().uuid().optional().nullable(),
  convenientTime: z.string().max(100).optional().nullable(),
  message: z.string().max(1000).optional().nullable(),
});

export type CreatePublicLeadInput = z.infer<typeof createPublicLeadSchema>;

export const updateLeadStatusSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum([
    "new",
    "contacted",
    "trial_scheduled",
    "converted",
    "lost",
  ]),
});
