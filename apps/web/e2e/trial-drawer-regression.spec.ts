import { expect, test } from "@playwright/test";

for (const mode of ["attached_session", "standalone"] as const) {
  test(`trial from student card submits ${mode}`, async ({ page }) => {
    test.setTimeout(60000);
    await page.route("**/api/crm/trials/options", (route) => route.fulfill({
      json: {
        ok: true, leads: [], students: [], rooms: [],
        teachers: [{ id: "a2222222-e222-3333-4444-555555555555", name: "Педагог" }],
        branches: [{ id: "b2222222-e222-3333-4444-555555555555", name: "Филиал" }],
        sessions: [{
          id: "c2222222-e222-3333-4444-555555555555",
          starts_at: "2026-09-08T10:00:00Z",
          groups: { title: "Тестовая группа", capacity: 8 },
        }],
      },
    }));
    let submissions = 0;
    await page.route("**/api/crm/trials", (route) => {
      submissions++;
      expect(route.request().postDataJSON().mode).toBe(mode);
      return route.fulfill({ status: 201, json: { ok: true, result: { trial_event_id: "test" } } });
    });
    await page.goto("/crm/students");
    await page.getByTitle("Подробнее").first().click();
    await page.getByRole("button", { name: "Записать на пробное", exact: true }).click();
    const trial = page.getByRole("dialog", { name: "Записать на пробное занятие", exact: true });
    await expect(trial).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    if (mode === "standalone") await trial.getByLabel("Отдельное пробное").click();
    // Real click: force:true would hide the drawer intercepting pointer events.
    await trial.getByRole("button", { name: "Записать 1", exact: true }).click({ timeout: 5000 });
    await expect(trial).not.toBeVisible();
    expect(submissions).toBe(1);
    await expect(page.getByText("Редактировать данные ученика")).toBeVisible();
  });
}
