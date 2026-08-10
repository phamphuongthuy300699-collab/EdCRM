import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const output = path.resolve(process.cwd(), "../../docs/media/finance-operations");
fs.mkdirSync(output, { recursive: true });

const account = { id: "10000000-0000-4000-8000-000000000001", guardian_id: "10000000-0000-4000-8000-000000000002", balance: -1500, updated_at: "2026-08-07T12:00:00Z", guardians: { full_name: "Тестовый родитель", phone: "+7 000 000-00-00", student_guardians: [{ students: { full_name: "Тестовый ученик" } }] } };
const payroll = { id: "10000000-0000-4000-8000-000000000003", teacher_id: "10000000-0000-4000-8000-000000000004", attendee_count: 6, rate_snapshot: 250, amount: 1500, status: "accrued", created_at: "2026-08-07T12:00:00Z", profiles: { full_name: "Тестовый преподаватель" }, lesson_sessions: { lesson_date: "2026-08-07", groups: { title: "Тестовая группа" } } };

async function mockFinance(page: Page) {
  await page.route("**/api/crm/media?path=branding/**", async (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#4b3f9f"/><text x="16" y="22" text-anchor="middle" font-size="18" font-family="sans-serif" fill="white">Р</text></svg>' }));
  await page.route("**/api/crm/finance?**", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const view = new URL(route.request().url()).searchParams.get("view") || "accounts";
    const items = view === "ledger"
      ? [{ id: "entry-1", entry_type: "lesson_debit", amount: -750, reason: "Занятие 2026-08-07", created_at: "2026-08-07T12:00:00Z" }]
      : view === "payroll" ? [payroll]
      : view === "warnings" ? [{ id: "problem-1", warning_type: "missing_teacher_rate", teacher_id: "10000000-0000-4000-8000-000000000004", created_at: "2026-08-07T12:00:00Z", lesson_sessions: { lesson_date: "2026-08-07", groups: { title: "Тестовая группа" } } }]
      : [account];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, canManage: true, view, items, total: items.length, hasMore: false, page: 1, summary: view === "payroll" ? [{ teacherId: payroll.teacher_id, teacherName: "Тестовый преподаватель", accrued: 1500, approved: 0, payable: 0, paid: 0 }] : null }) });
  });
  await page.route("**/api/crm/finance", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }));
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}

test.describe("finance operational contour", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(process.env.REAL_SUPABASE === "true", "Uses synthetic finance fixtures without personal data");

  test("24-step admin account, lesson policy and payroll journey", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 }); // 1
    await mockFinance(page); // 2
    await page.goto("/crm/finance", { waitUntil: "domcontentloaded" }); // 3
    await expect(page.getByRole("heading", { name: "Финансы" })).toBeVisible(); // 4
    await expect(page.getByRole("button", { name: "Лицевые счета" })).toBeVisible(); // 5
    await page.getByLabel("Поиск лицевых счетов").fill("Тестовый ученик"); // 6
    await expect(page.getByText("Тестовый родитель")).toBeVisible(); // 7
    await page.getByText("Тестовый родитель").click(); // 8
    await expect(page.getByRole("dialog")).toBeVisible(); // 9
    await expect(page.getByText("Занятие 2026-08-07")).toBeVisible(); // 10
    await page.screenshot({ path: path.join(output, "crm-account-drawer.png"), fullPage: true }); // 11
    await page.getByLabel("Сумма").fill("500"); // 12
    await page.getByLabel("Причина корректировки").fill("Тестовая корректировка"); // 13
    await expect(page.getByRole("button", { name: "Задать начальный остаток / добавить операцию" })).toBeEnabled(); // 14
    await page.getByRole("button", { name: "Закрыть" }).click(); // 15
    await page.getByRole("button", { name: "Начисления преподавателям" }).click(); // 16
    await expect(page.getByRole("row", { name: /Тестовый преподаватель/ })).toBeVisible(); // 17
    await expect(page.getByRole("row", { name: /Тестовый преподаватель/ }).getByText("1 500,00 ₽", { exact: true })).toBeVisible(); // 18
    await page.screenshot({ path: path.join(output, "crm-payroll.png"), fullPage: true }); // 19
    await page.getByRole("button", { name: "Проблемы" }).click(); // 20
    await expect(page.getByText("Не задана ставка преподавателя")).toBeVisible(); // 21
    await page.screenshot({ path: path.join(output, "crm-problems.png"), fullPage: true }); // 22
    await noOverflow(page); // 23
    await expect(page.getByRole("link", { name: "Финансы" })).toBeVisible(); // 24
  });

  test("group billing editor and mobile operational screens fit", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.route("**/api/crm/media?path=branding/**", async (route) => route.fulfill({ status: 200, contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#4b3f9f"/><text x="16" y="22" text-anchor="middle" font-size="18" font-family="sans-serif" fill="white">Р</text></svg>' }));
    await page.route("https://placeholder.supabase.co/rest/v1/**", async (route) => route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/0" }, body: "[]" }));
    await page.goto("/crm/groups", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Редактировать" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Редактировать группу" });
    await expect(dialog.getByText("Оплата занятий")).toBeVisible();
    await dialog.screenshot({ path: path.join(output, "crm-group-billing.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/teacher", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: "Сегодня", exact: true })).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: path.join(output, "teacher-mobile.png"), fullPage: true });
    await page.goto("/parent/payments", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Оплаты и счета", exact: true })).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: path.join(output, "parent-mobile.png"), fullPage: true });
  });
});
