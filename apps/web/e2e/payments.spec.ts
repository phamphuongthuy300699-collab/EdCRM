import { test, expect } from "@playwright/test";

test.describe("Invoicing and Payments Page", () => {
  test.skip(process.env.REAL_SUPABASE === "true", "Skipping demo E2E in Real Mode");

  test("should render payments page with bills list", async ({ page }) => {
    await page.goto("/crm/payments");
    await expect(page.locator("h1")).toContainText("Счета и Оплаты");
  });
});
