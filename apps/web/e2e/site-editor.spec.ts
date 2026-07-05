import { expect, test } from "@playwright/test";

test.describe("CRM Site Editor Spec", () => {
  test.skip(process.env.REAL_SUPABASE === "true", "Skipping demo E2E in Real Mode");

  test("keeps operational directories in settings", async ({ page }) => {
    await page.goto("/crm/site", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("Управление сайтом");

    await Promise.all([
      page.waitForURL("**/crm/settings?tab=courses", { waitUntil: "domcontentloaded" }),
      page.getByTestId("site-tab-courses").click(),
    ]);
    await expect(page.locator("h1")).toContainText("Настройки системы");
    await expect(page.locator("h2")).toContainText("Направления");

    await page.goto("/crm/site", { waitUntil: "domcontentloaded" });
    await Promise.all([
      page.waitForURL("**/crm/settings?tab=groups", { waitUntil: "domcontentloaded" }),
      page.getByTestId("site-tab-schedule").click(),
    ]);
    await expect(page.locator("h2")).toContainText("Группы и расписание");

    await page.goto("/crm/site", { waitUntil: "domcontentloaded" });
    await Promise.all([
      page.waitForURL("**/crm/settings?tab=courses", { waitUntil: "domcontentloaded" }),
      page.getByTestId("site-tab-prices").click(),
    ]);
    await expect(page.locator("h2")).toContainText("Направления");
  });

  test("should allow editing homepage Hero block", async ({ page }) => {
    await page.goto("/crm/site", { waitUntil: "domcontentloaded" });

    await expect(page.locator('text=Блок «Hero»')).toBeVisible();

    const h1Input = page.locator('label:has-text("Главный заголовок (H1)") + input');
    await h1Input.fill("Супер заголовок для привлечения лидов");

    const bulletsInput = page.locator('label:has-text("Преимущества") + input');
    await expect(bulletsInput).toBeVisible();

    const saveBtn = page.locator('button[type="submit"]:has-text("Сохранить все изменения блоков")');
    await expect(saveBtn).toBeEnabled();
  });
});
