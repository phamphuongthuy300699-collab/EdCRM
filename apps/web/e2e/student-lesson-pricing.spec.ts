import { expect, test } from "@playwright/test";

test.describe("personal student lesson pricing", () => {
  test.skip(process.env.REAL_SUPABASE === "true", "Deterministic demo UI evidence");

  test("requires a price during creation and edits it in the student card", async ({ page }) => {
    await page.goto("/crm/students");
    await page.getByRole("button", { name: "Создать ученика" }).click();

    const createDialog = page.getByRole("dialog", { name: "Добавить ученика вручную" });
    const createPrice = createDialog.getByLabel("Цена одного занятия, ₽ *");
    await expect(createPrice).toBeVisible();
    await expect(createPrice).toHaveAttribute("required", "");
    await createPrice.fill("725");
    await expect(createPrice).toHaveValue("725");

    await page.goto("/crm/students/1");
    await page.getByRole("button", { name: "Редактировать профиль" }).click();
    const editPrice = page.getByLabel("Цена одного занятия, ₽ *");
    await expect(editPrice).toHaveValue("750");
    await editPrice.fill("825");
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByText("825 ₽")).toBeVisible();
  });
});
