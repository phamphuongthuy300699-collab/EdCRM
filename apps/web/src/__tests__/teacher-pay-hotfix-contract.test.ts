import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");
const migration = () => read("../../supabase/migrations/20260811000004_teacher_pay_modes_and_schedule_bounds.sql");

describe("teacher pay modes and bounded schedules", () => {
  it("stores a mode and immutable calculation inputs on payroll snapshots", () => {
    const sql = migration();
    expect(sql).toContain("add column if not exists pay_mode");
    expect(sql).toContain("add column if not exists rate numeric");
    expect(sql).toContain("new.pay_mode := selected_mode");
    expect(sql).toContain("when selected_mode = 'per_lesson' then selected_rate");
  });

  it("repairs only unresolved missing-rate accruals using the selected mode", () => {
    const sql = migration();
    expect(sql).toContain("p_pay_mode text");
    expect(sql).toContain("warning.warning_type = 'missing_teacher_rate'");
    expect(sql).toContain("payroll.status = 'accrued'");
    expect(sql).toContain("when p_pay_mode = 'per_lesson' then p_rate");
  });

  it("bounds rebuilt recurring lessons by group start and end dates", () => {
    const sql = migration();
    expect(sql).toContain("greatest(current_date, coalesce(target_group.starts_on, current_date))");
    expect(sql).toContain("least(current_date + 84, coalesce(target_group.ends_on, current_date + 84))");
    expect(sql).toContain("rescheduled_from_session_id is null");
  });

  it("requires mode in the finance API contract", () => {
    const route = read("src/app/api/crm/finance/teacher-rates/route.ts");
    expect(route).toContain('mode: z.enum(["per_attendee", "per_lesson"])');
    expect(route).toContain("p_pay_mode: parsed.data.mode");
  });
});
