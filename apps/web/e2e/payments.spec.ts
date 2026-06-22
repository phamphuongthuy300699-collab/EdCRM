import { test, expect } from "@playwright/test";

test.describe("Invoicing and Payments Page", () => {
  test("should render payments page with bills list", async ({ page }) => {
    await page.goto("/crm/payments");
    
    // Check main title
    await expect(page.locator("h1")).toContainText("Счета и Оплаты");
  });
});
