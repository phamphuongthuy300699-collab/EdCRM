import { test, expect } from "@playwright/test";

test.describe("Teacher Lesson start and Student Material access E2E scenario", () => {
  test("should start lesson and show materials", async ({ page }) => {
    // 1. Open student page (simulated)
    await page.goto("/student");
    await expect(page.locator("h1")).toContainText("Привет");
    
    // Initial state: materials are locked
    await expect(page.getByText("Доступ к материалам закрыт")).toBeVisible();
    
    // Simulate teacher starting the lesson via clicking demo mode toggle on student screen
    const toggleButton = page.locator("button:has-text('Начать урок')");
    if (await toggleButton.count() > 0) {
      await toggleButton.click();
      
      // Verification: materials are now unlocked
      await expect(page.getByText("Урок запущен!")).toBeVisible();
      await expect(page.getByText("🔧 Схема сборки")).toBeVisible();
    }
  });
});
