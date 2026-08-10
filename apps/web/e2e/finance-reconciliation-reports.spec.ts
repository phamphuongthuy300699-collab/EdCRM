import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const output = path.resolve(process.cwd(), "../../docs/media/finance-reconciliation");
fs.mkdirSync(output, { recursive: true });
const payment = { id: "20000000-0000-4000-8000-000000000001", amount: 2400, provider: "manual", status: "paid", paid_at: "2026-08-03T10:00:00Z", reflected: false, invoices: { number: "TEST-001" }, guardians: { full_name: "Тестовый плательщик" } };
const warning = { id: "warning-1", warning_type: "missing_lesson_price", lesson_session_id: "20000000-0000-4000-8000-000000000002", details: { groupId: "20000000-0000-4000-8000-000000000003" }, lesson_sessions: { lesson_date: "2026-08-04", group_id: "20000000-0000-4000-8000-000000000003", groups: { title: "Тестовая группа" } } };

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}

async function mockApp(page: Page) {
  let paymentReflected = false;
  let warningResolved = false;
  await page.route("**/api/crm/media?path=branding/**", (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#4b3f9f"/><text x="16" y="22" text-anchor="middle" font-size="18" fill="white">Р</text></svg>' }));
  await page.route("**/api/crm/finance?**", async (route) => {
    const url = new URL(route.request().url());
    const view = url.searchParams.get("view") || "accounts";
    const items = view === "reconciliation" ? [{ ...payment, reflected: paymentReflected }] : view === "warnings" && !warningResolved ? [warning] : [];
    const summary = view === "reconciliation" ? { paidCount: 1, paidAmount: 2400, reflectedCount: paymentReflected ? 1 : 0, unreflectedCount: paymentReflected ? 0 : 1 } : null;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, canManage: true, view, items, summary, page: 1, total: items.length, hasMore: false }) });
  });
  await page.route("**/api/crm/finance/reconcile", async (route) => {
    const body = route.request().postDataJSON();
    if (body.action === "payments") paymentReflected = true;
    if (body.action === "lesson") warningResolved = true;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.route("https://placeholder.supabase.co/rest/v1/**", (route) => route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/0" }, body: "[]" }));
  await page.route("**/api/crm/reports?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
    ok: true,
    directories: { branches: [{ id: "branch", name: "Тестовый филиал" }], courses: [{ id: "course", title: "Тестовое направление" }], groups: [{ id: "group", title: "Тестовая группа" }], teachers: [{ id: "teacher", name: "Тестовый преподаватель" }] },
    report: {
      sources: { cash: "payments paid/succeeded", lessonDebits: "billing_ledger_entries.lesson_debit", payroll: "teacher_payroll_entries snapshots" },
      students: { active: 8, withoutGroup: 1, newInPeriod: 2 }, groups: { active: 2, occupancyRate: 75 },
      lessons: { scheduled: 12, completed: 9, cancelled: 1, moved: 2 }, attendance: { rate: 88, present: 38, late: 3 },
      finance: { cashReceived: 12400, paidPayments: 5, lessonDebits: 8400, totalDebt: 1700, debtors: 1 },
      payroll: { accrued: 4200, approved: 3000, payable: 1200, paid: 1800 },
      groupRows: [{ id: "group", title: "Тестовая группа", teacher: "Тестовый преподаватель", students: 6, capacity: 8, occupancyRate: 75, completedLessons: 5, visits: 24, absences: 3, lessonDebits: 4800, teacherPayroll: 2400 }],
      teacherRows: [{ id: "teacher", teacher: "Тестовый преподаватель", completedLessons: 9, actualVisits: 41, averageChildren: 4.6, accrued: 4200, approved: 3000, paid: 1800, payable: 1200 }],
      attendanceRows: [{ studentId: "student", student: "Тестовый ученик", groupId: "group", group: "Тестовая группа", lessons: 8, present: 6, late: 1, absentExcused: 1, absentUnexcused: 0, rate: 88 }],
      debtRows: [{ guardian: "Тестовый плательщик", children: "Тестовый ученик", balance: -1700, lastPayment: "2026-08-03", lastDebit: "2026-08-05" }],
    },
  }) }));
  await page.route("**/api/crm/reports/export?**", (route) => route.fulfill({ status: 200, contentType: "text/csv; charset=utf-8", headers: { "content-disposition": 'attachment; filename="report.csv"' }, body: "\uFEFFТест;Сумма\r\nСтрока;100" }));
}

test.describe("finance reconciliation and reports", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(process.env.REAL_SUPABASE === "true", "Uses synthetic operational fixtures");

  test("admin repairs finance and inspects management reports", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await mockApp(page);
    await page.goto("/crm/finance", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Лицевые счета не найдены.")).toBeVisible();
    await page.getByRole("button", { name: "Сверка" }).click();
    await expect(page.getByText("Не отражено")).toBeVisible();
    await expect(page.getByText("Тестовый плательщик")).toBeVisible();
    await page.screenshot({ path: path.join(output, "finance-cutover.png"), fullPage: true });
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Зачислить выбранные исторические оплаты" }).click();
    await expect(page.getByText(/учтено/)).toBeVisible();

    await page.getByRole("button", { name: "Проблемы" }).click();
    await expect(page.getByText("Не задана цена занятия")).toBeVisible();
    await expect(page.getByRole("link", { name: "Настроить стоимость группы" })).toHaveAttribute("href", /crm\/groups/);
    await page.getByRole("button", { name: "Повторить финансовую обработку" }).click();
    await expect(page.getByText("Открытых финансовых проблем нет.")).toBeVisible();
    await page.screenshot({ path: path.join(output, "finance-problems-repaired.png"), fullPage: true });

    await page.goto("/crm/reports", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Отчёты" })).toBeVisible();
    await expect(page.getByText("Получено оплат")).toBeVisible();
    await expect(page.getByText("Стоимость проведённых занятий")).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: path.join(output, "management-kpi-1366.png"), fullPage: true });
    await page.getByRole("button", { name: "По преподавателям" }).click();
    await expect(page.getByRole("cell", { name: "Тестовый преподаватель" })).toBeVisible();
    await page.screenshot({ path: path.join(output, "teacher-report.png"), fullPage: true });
    await page.getByRole("button", { name: "Задолженность" }).click();
    await expect(page.getByText("Тестовый плательщик")).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: /Скачать задолженность CSV/ }).click();
    await expect(await download).toBeTruthy();

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole("button", { name: "Обзор" }).click();
    await noOverflow(page);
    await page.screenshot({ path: path.join(output, "management-kpi-1280.png"), fullPage: true });
  });
});
