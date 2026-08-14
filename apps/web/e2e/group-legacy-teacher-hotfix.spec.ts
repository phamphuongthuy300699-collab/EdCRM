import { expect, test } from "@playwright/test";

test.describe("group status edit hotfix", () => {
  test.skip(process.env.REAL_SUPABASE === "true", "Uses disposable demo data only");

  test("loads the current status and persists a changed status", async ({ page }) => {
    await page.route("https://placeholder.supabase.co/rest/v1/**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await page.goto("/crm/groups", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Редактировать" }).first().click();

    const dialog = page.getByRole("dialog", { name: "Редактировать группу" });
    const status = dialog.getByLabel("Статус");
    await expect(status).toHaveValue("active");
    await dialog.locator("select").first().evaluate((select) => select.removeAttribute("required"));
    await status.selectOption("draft");

    page.once("dialog", (alert) => alert.accept());
    await dialog.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Черновик", { exact: true }).first()).toBeVisible();
  });
});
