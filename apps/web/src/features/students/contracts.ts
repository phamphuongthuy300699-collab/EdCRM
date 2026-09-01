import { z } from "zod";

const currentMoscowDate = () => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

export const studentUpdateSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200),
    birthDate: z
      .iso.date()
      .nullable()
      .refine(
        (value) =>
          value === null || value <= currentMoscowDate(),
        "Дата рождения не может быть в будущем",
      ),
    notes: z.string().trim().max(5000).nullable(),
    lessonPrice: z.number().positive(),
  })
  .strict();

export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;
