import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("student editor, trial appointments, and personal pricing integration", () => {
  it("uses the simplified student list with working drawer and trial actions", () => {
    const page = read("src/app/(crm)/crm/students/page.tsx");

    expect(page).toContain('import { TrialDialog } from "@/features/trials/TrialDialog"');
    expect(page).toContain("saveStudentDetails");
    expect(page).toContain("setTrialStudent(student)");
    expect(page).toContain("Редактировать данные ученика");
    expect(page).toContain("Цена одного занятия, ₽ *");
    expect(page).toContain("lessonPrice");
    expect(page).toContain('<a href={`tel:${student.phone}`}');
    expect(page).not.toContain('title="История оплат"');
    expect(page).not.toContain("<CreditCard");
    expect(page).not.toContain("Успеваемость (Посещаемость + ДЗ)");
    expect(page).not.toContain("<th>Оплата</th>");
  });

  it("updates identity fields and personal price through the tenant-scoped API", () => {
    const contracts = read("src/features/students/contracts.ts");
    const route = read("src/app/api/crm/students/[studentId]/route.ts");

    expect(contracts).toContain("lessonPrice: z.number().positive()");
    expect(route).toContain("lesson_price: parsed.data.lessonPrice");
    expect(route).toContain('.eq("organization_id", access.organizationId)');
    expect(route).toContain("lesson_price");
    expect(route).toContain("lessonPrice: Number(data.lesson_price)");
  });

  it("keeps required pricing on creation and installs the dedicated trial domain", () => {
    const createRoute = read("src/app/api/crm/students/manage/route.ts");
    const trialMigration = path.resolve(
      process.cwd(),
      "../../supabase/migrations/20260830000001_trial_events_and_participants.sql",
    );

    expect(createRoute).toContain("lessonPrice: z.number().positive()");
    expect(createRoute).toContain("lesson_price: input.lessonPrice");
    expect(fs.existsSync(trialMigration)).toBe(true);
  });

  it("keeps trial appointments and self-conflict protection in the final schedule function", () => {
    const migration = read(
      "../../supabase/migrations/20260901000001_consolidate_trial_group_schedule.sql",
    );

    expect(migration).toContain("from public.trial_events event");
    expect(migration).toContain("other.group_id = p_group_id");
    expect(migration).toContain("other.starts_at <> occurrence_start");
    expect(migration).toContain("other.group_id <> p_group_id");
  });
});
