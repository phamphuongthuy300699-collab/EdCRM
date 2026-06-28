import { test, expect } from "@playwright/test";

test.describe("CRM Site Editor Spec", () => {
  test.skip(process.env.REAL_SUPABASE === "true", "Skipping demo E2E in Real Mode");

  test("should allow navigating through site editor tabs", async ({ page }) => {
    // 1. Go to CRM site editor page
    await page.goto("/crm/site");
    await expect(page.locator("h1")).toContainText("Управление сайтом");

    // 2. Click on different tabs and check if their content is visible
    // "Курсы" tab
    await page.click('button:has-text("Курсы")');
    await expect(page.locator('text=Курсы в системе')).toBeVisible();

    // "Расписание" tab
    await page.click('button:has-text("Расписание")');
    await expect(page.locator('text=Группы и расписание')).toBeVisible();

    // "Цены" tab
    await page.click('button:has-text("Цены")');
    await expect(page.locator('text=Редактор цен и общих тарифов')).toBeVisible();

    // "SEO" tab
    await page.click('button:has-text("SEO")');
    await expect(page.locator('text=SEO настройки главной страницы')).toBeVisible();
  });

  test("should allow editing course details in a modal", async ({ page }) => {
    await page.goto("/crm/site");
    
    // Go to Courses tab
    await page.click('button:has-text("Курсы")');
    
    // Click edit on the first course
    const editBtn = page.locator('button:has-text("Редактировать курс")').first();
    await editBtn.click();

    // Verify modal opened
    await expect(page.locator('h3:has-text("Редактировать курс")')).toBeVisible();

    // Input new title and check save button
    const titleInput = page.locator('input[required]').first();
    await titleInput.fill("Новый экспериментальный курс");

    const saveBtn = page.locator('button[type="submit"]:has-text("Сохранить")');
    await expect(saveBtn).toBeEnabled();
    
    // Click Cancel
    await page.click('button:has-text("Отмена")');
    await expect(page.locator('h3:has-text("Редактировать курс")')).not.toBeVisible();
  });

  test("should allow editing homepage Hero block", async ({ page }) => {
    await page.goto("/crm/site");
    
    // Go to "Главная" tab (which is default active)
    await expect(page.locator('text=Блок «Hero»')).toBeVisible();

    // Fill Hero Title
    const h1Input = page.locator('label:has-text("Главный заголовок (H1)") + input');
    await h1Input.fill("Супер заголовок для привлечения лидов");

    // Check Bullets list input
    const bulletsInput = page.locator('label:has-text("Преимущества") + input');
    await expect(bulletsInput).toBeVisible();

    // Check save button is active
    const saveBtn = page.locator('button[type="submit"]:has-text("Сохранить все изменения блоков")');
    await expect(saveBtn).toBeEnabled();
  });
});
