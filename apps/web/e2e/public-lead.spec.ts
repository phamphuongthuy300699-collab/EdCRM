import { test, expect } from "@playwright/test";

test.describe("Public Lead Registration Form", () => {
  test.skip(process.env.REAL_SUPABASE === "true", "Skipping demo E2E in Real Mode");

  test("should register a new lead and redirect to thanks page", async ({ page }) => {
    // Navigate to landing page
    await page.goto("/", { waitUntil: "domcontentloaded" });
    
    // Fill the lead form
    await page.fill('input[placeholder="Иван Иванов"]', "Иван Петров");
    await page.fill('input[placeholder="Миша"]', "Миша Петров");
    await page.fill('input[placeholder="+7 (999) 123-45-67"]', "89055551234");
    
    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to /thanks page
    await expect(page).toHaveURL(/\/thanks$/);
    await expect(page.locator("h1")).toBeVisible();
  });
});
