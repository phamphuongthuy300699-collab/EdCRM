import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("P0 operations consistency contracts", () => {
  it("opens the CRM schedule on the Moscow current week with honest empty states", () => {
    const workspace = read("src/features/scheduling/ScheduleWorkspace.tsx");
    expect(workspace).toContain('useState<Period>("week")');
    expect(workspace).toContain('period === "today" ? "На сегодня занятий нет" : "На этой неделе занятий нет"');
    expect(workspace).toContain("Загрузка расписания");
    expect(workspace).toContain("!error && !sessions.length");
    expect(workspace).toContain("Europe/Moscow");
  });

  it("does not use ambiguous payroll-to-profiles embeds on any payroll read surface", () => {
    for (const relative of [
      "src/app/api/crm/finance/route.ts",
      "src/app/api/crm/reports/route.ts",
      "src/app/api/crm/reports/export/route.ts",
    ]) {
      const source = read(relative);
      expect(source, relative).not.toMatch(/teacher_payroll_entries[\s\S]{0,500}profiles\(full_name\)/);
      expect(source, relative).toContain("loadPayrollTeacherNames");
    }
  });

  it("uses canonical lead fields and reports dashboard failures instead of zero KPI", () => {
    const route = read("src/app/api/crm/dashboard/route.ts");
    const page = read("src/app/(crm)/crm/page.tsx");
    expect(route).toContain("parent_name, parent_phone");
    expect(route).not.toContain("first_name, phone");
    expect(route).toContain("diagnostics");
    expect(page).toContain("Не удалось загрузить данные рабочего стола");
    expect(page).toContain("Повторить");
    expect(page).toContain("statsData, setStatsData] = useState<DashboardStats | null>(null)");
  });

  it("keeps the missing-rate repair narrow and historical snapshots otherwise immutable", () => {
    const migration = read("../../supabase/migrations/20260811000004_teacher_pay_modes_and_schedule_bounds.sql");
    expect(migration).toContain("payroll.status = 'accrued'");
    expect(migration).toContain("warning.warning_type = 'missing_teacher_rate'");
    expect(migration).toContain("warning.resolved_at is null");
  });
});
