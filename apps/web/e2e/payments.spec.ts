import { test, expect } from "@playwright/test";

test.describe("Invoicing and Payments Page", () => {
  test.skip(process.env.REAL_SUPABASE === "true", "Skipping demo E2E in Real Mode");

  test("should render payments page with bills list", async ({ page }) => {
    await page.goto("/crm/payments");
    await expect(page.getByRole("heading", { level: 1, name: "Платежи (Payments Registry)" })).toBeVisible();
    await expect(page.getByText("Игорь Петров")).toBeVisible();
  });
});
