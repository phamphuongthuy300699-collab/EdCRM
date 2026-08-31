import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("per-student lesson pricing contracts", () => {
  const migration = () => read("../../supabase/migrations/20260831000003_student_lesson_pricing.sql");

  it("stores and validates the price on students and never rewrites ledger history", () => {
    const sql = migration();
    expect(sql).toContain("add column if not exists lesson_price numeric(12,2)");
    expect(sql).toContain("students_lesson_price_positive");
    expect(sql).toContain("student_row.lesson_price");
    expect(sql).not.toContain("-target_group.lesson_price");
    expect(sql).not.toContain("balance - target_group.lesson_price");
  });

  it("requires the price in every interactive student creation flow", () => {
    const studentsPage = read("src/app/(crm)/crm/students/page.tsx");
    const guardiansPage = read("src/app/(crm)/crm/guardians/page.tsx");
    const leadsPage = read("src/app/(crm)/crm/leads/page.tsx");
    const createRoute = read("src/app/api/crm/students/manage/route.ts");
    const relationsRoute = read("src/app/api/crm/client-relations/route.ts");
    const convertRoute = read("src/app/api/crm/leads/convert/route.ts");

    for (const source of [studentsPage, guardiansPage, leadsPage]) {
      expect(source).toContain("Цена одного занятия");
      expect(source).toContain("lessonPrice");
    }
    expect(createRoute).toContain("lessonPrice: z.number().positive()");
    expect(createRoute).toContain("lesson_price: input.lessonPrice");
    expect(relationsRoute).toContain("lessonPrice: z.number().positive()");
    expect(relationsRoute).toContain("lesson_price: input.student.lessonPrice");
    expect(convertRoute).toContain("p_lesson_price: lessonPrice");
  });

  it("edits the value on the student card and routes missing-price repairs there", () => {
    const studentPage = read("src/app/(crm)/crm/students/[studentId]/page.tsx");
    const financePage = read("src/app/(crm)/crm/finance/page.tsx");
    const groupsPage = read("src/app/(crm)/crm/groups/page.tsx");

    expect(studentPage).toContain("lesson_price");
    expect(studentPage).toContain("Цена одного занятия");
    expect(financePage).toContain("Указать тариф ученика");
    expect(financePage).toContain("`/crm/students/${problem.student_id}`");
    expect(groupsPage).not.toContain("Цена одного занятия, ₽");
  });
});
