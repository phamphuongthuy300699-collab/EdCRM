import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const screenshotDir = path.resolve(process.cwd(), "../../docs/media/teacher-access-payroll-hotfix");
fs.mkdirSync(screenshotDir, { recursive: true });

test.describe("teacher access and payroll hotfix visuals", () => {
  test.skip(process.env.REAL_SUPABASE === "true", "Sanitized demo screenshots only");

  test("captures the pay-mode editor and bounded group editor", async ({ page }) => {
    await page.goto("/crm/settings?tab=staff", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Сотрудники и доступы" })).toBeVisible();
    await page.getByRole("button", { name: "Редактировать" }).first().click();
    const staffDialog = page.getByRole("dialog", { name: "Редактировать сотрудника" });
    await expect(staffDialog.getByRole("group", { name: "Схема оплаты преподавателя" })).toBeVisible();
    const safeInputs = staffDialog.locator('input:not([type="file"])');
    await safeInputs.nth(0).fill("Тестовый преподаватель");
    await safeInputs.nth(1).fill("teacher@example.test");
    await safeInputs.nth(2).fill("+70000000000");
    await staffDialog.getByRole("button", { name: "За занятие" }).click();
    await expect(staffDialog.getByText("Ставка за проведённое занятие, ₽")).toBeVisible();
    await staffDialog.screenshot({ path: path.join(screenshotDir, "staff-pay-mode.png") });
    await staffDialog.getByRole("button", { name: "Закрыть" }).click();

    await page.getByRole("button", { name: "Группы" }).click();
    await page.getByRole("button", { name: "Редактировать" }).first().click();
    const groupDialog = page.getByRole("dialog", { name: "Редактировать группу" });
    await expect(groupDialog.getByText("Пересчитать будущие занятия")).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 1200 });
    await groupDialog.locator("input").first().fill("Тестовая группа");
    await groupDialog.locator('input[type="date"]').nth(0).fill("2026-09-01");
    await groupDialog.locator('input[type="date"]').nth(1).fill("2026-12-20");
    await groupDialog.locator("select").evaluateAll((selects) => {
      const safeSelectedLabels = ["Тестовый курс", "active", "Тестовый филиал", "Кабинет 1", "Тестовый преподаватель"];
      selects.forEach((select, index) => {
        const option = (select as HTMLSelectElement).selectedOptions[0];
        if (option && safeSelectedLabels[index]) option.textContent = safeSelectedLabels[index];
      });
    });
    await groupDialog.getByRole("heading", { name: "Расписание" }).scrollIntoViewIfNeeded();
    await groupDialog.screenshot({ path: path.join(screenshotDir, "group-schedule-bounds.png") });
  });
});
