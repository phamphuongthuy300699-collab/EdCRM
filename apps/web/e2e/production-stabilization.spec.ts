import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const output = path.resolve(process.cwd(), "../../docs/media/production-stabilization");
fs.mkdirSync(output, { recursive: true });

test.describe("production stabilization evidence", () => {
  test.skip(process.env.REAL_SUPABASE === "true", "Sanitized deterministic screenshots only");

  test("legacy access and teacher preview remain clear and read-only", async ({ page }) => {
    await page.goto("/crm/settings?tab=staff", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Сотрудники и доступы" })).toBeVisible();
    await page.getByRole("button", { name: "Создать доступ" }).first().click();

    const accessDialog = page.getByRole("dialog", { name: "Создать доступ в кабинет" });
    await accessDialog.getByLabel("Email / логин для ЛК").fill("teacher@example.invalid");
    const description = accessDialog.getByText(/Канонический профиль/);
    await expect(description).toBeVisible();
    await description.evaluate((element) => {
      element.textContent = "Канонический профиль «Тестовый преподаватель» и связанные занятия останутся без изменений. Укажите отдельный логин для Supabase Auth.";
    });
    await accessDialog.screenshot({ path: path.join(output, "legacy-teacher-access.png") });

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/teacher?previewTeacherId=a2222222-e222-3333-4444-555555555555", { waitUntil: "domcontentloaded" });
    const previewBanner = page.getByRole("status");
    await expect(previewBanner).toContainText("Режим просмотра администратора");
    await previewBanner.locator("span").evaluate((element) => {
      element.textContent = "Преподаватель: Тестовый преподаватель. Изменения и завершение занятий отключены.";
    });
    await expect(page.getByRole("button", { name: "Начать занятие" })).toHaveCount(0);
    await page.screenshot({ path: path.join(output, "admin-teacher-preview.png"), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/teacher", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: "Рабочее место преподавателя", exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(output, "teacher-mobile.png"), fullPage: true });
  });
});
