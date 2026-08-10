import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("finance management workflows", () => {
  it("paginates finance datasets and searches account relations in the database", () => {
    const route = read("src/app/api/crm/finance/route.ts");
    expect(route).toContain('searchParams.get("view")');
    expect(route).toContain('searchParams.get("page")');
    expect(route).toContain('searchParams.get("pageSize")');
    expect(route).toContain(".range(");
    expect(route).toContain('from("guardians")');
    expect(route).toContain('from("students")');
    expect(route).not.toContain("filteredAccounts");
    expect(route).not.toContain(".limit(300)");
  });

  it("exposes explicit payment and completed-lesson reconciliation", () => {
    const route = read("src/app/api/crm/finance/reconcile/route.ts");
    expect(route).toContain("reconcile_paid_payment");
    expect(route).toContain("reconcile_lesson_finance");
    expect(route).toContain("Исторические оплаты и начальный остаток нельзя учитывать дважды");
    expect(route).not.toContain("autoBackfill");
  });

  it("makes warnings, cutover and payroll periods actionable", () => {
    const page = read("src/app/(crm)/crm/finance/page.tsx");
    for (const label of [
      "Сверка",
      "Назначить плательщика",
      "Настроить стоимость группы",
      "Настроить ставку",
      "Повторить финансовую обработку",
      "Зачислить выбранные исторические оплаты",
      "Одобрить все начисления",
      "Отметить одобренные выплаченными",
      "Показать ещё",
    ]) expect(page).toContain(label);
  });

  it("offers visible-data CSV exports with an Excel BOM", () => {
    const csv = read("src/lib/finance/csv.ts");
    const financeExport = read("src/app/api/crm/finance/export/route.ts");
    const reportExport = read("src/app/api/crm/reports/export/route.ts");
    expect(csv).toContain("\\uFEFF");
    expect(financeExport).toContain("ledger");
    for (const type of ["attendance", "debt", "payroll"]) expect(reportExport).toContain(type);
    expect(reportExport).not.toMatch(/token|secret/i);
  });

  it("keeps the dashboard operational and links to finance workspaces", () => {
    const route = read("src/app/api/crm/dashboard/route.ts");
    const page = read("src/app/(crm)/crm/page.tsx");
    for (const field of ["todayCompleted", "todayRemaining", "parentDebt", "monthPayroll"]) expect(route).toContain(field);
    for (const label of ["Открыть расписание", "Открыть должников", "Открыть payroll"]) expect(page).toContain(label);
  });
});
