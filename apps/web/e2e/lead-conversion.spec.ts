import { test, expect } from "@playwright/test";

test.describe("Leads Conversion in CRM", () => {
  test.skip(process.env.REAL_SUPABASE === "true", "Skipping demo E2E in Real Mode");

  test("should load leads list page", async ({ page }) => {
    // In demo mode or bypass auth
    await page.goto("/crm/leads");
    
    await expect(page.locator("h1")).toContainText("Заявки и Лиды");
    
    // Check search input exists
    const searchInput = page.locator('input[placeholder="Поиск по имени, тел..."]');
    await expect(searchInput).toBeVisible();
  });
});
