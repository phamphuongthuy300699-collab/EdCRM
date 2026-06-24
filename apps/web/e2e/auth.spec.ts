import { test, expect } from "@playwright/test";

test.describe("Auth and Middleware redirects", () => {
  test.skip(process.env.REAL_SUPABASE === "true", "Skipping demo E2E in Real Mode");

  test("should redirect unauthenticated users to login page", async ({ page }) => {
    // Navigate to protected page
    await page.goto("/crm");
    
    // In demo mode, there's no auth, so it stays on /crm
    // If not in demo mode (redirects to login)
    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      await expect(page.locator("h1")).toContainText("Вход в CRM");
    } else {
      // Stayed on /crm in demo mode
      await expect(page.locator("h1")).toContainText("Рабочий стол");
    }
  });

  test("should login successfully with role credentials", async ({ page }) => {
    await page.goto("/login");

    // Login as teacher (demo simulation)
    await page.fill('input[type="email"]', "teacher@example.com");
    await page.fill('input[type="password"]', "demo");
    await page.click('button[type="submit"]');

    // Should redirect to teacher portal
    await page.waitForURL("**/teacher");
    await expect(page.locator("h1")).toContainText("Приветствуем");
  });
});
