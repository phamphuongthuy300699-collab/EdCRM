import { expect, test } from "@playwright/test";

test("student row actions open the real card and shared trial dialog", async ({
  page,
}) => {
  await page.route("**/api/crm/trials/options**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        leads: [],
        students: [],
        teachers: [
          { id: "a2222222-e222-3333-4444-555555555555", name: "Педагог" },
        ],
        branches: [
          { id: "b2222222-e222-3333-4444-555555555555", name: "Филиал" },
        ],
        rooms: [],
        sessions: [
          {
          id: "c2222222-e222-3333-4444-555555555555",
          teacher_id: "a2222222-e222-3333-4444-555555555555",
          starts_at: "2026-09-01T14:00:00.000Z",
          groups: {
            title: "LEGO Start",
            branch_id: "b2222222-e222-3333-4444-555555555555",
              capacity: 8,
              courses: { title: "Робототехника" },
              branches: { name: "Неделина" },
            },
            profiles: { full_name: "Педагог" },
            rooms: { name: "Кабинет 1" },
            enrollmentCount: 5,
            makeupCount: 1,
            trialParticipantCount: 1,
            remainingCapacity: 1,
          },
        ],
      }),
    });
  });

  await page.goto("/crm/students");
  await expect(
    page.getByRole("heading", { name: "База учеников" }),
  ).toBeVisible();

  await page.getByTitle("Подробнее").first().click();
  await expect(page.getByText("Редактировать данные ученика")).toBeVisible();
  await expect(page.getByLabel("Дата рождения").last()).toBeVisible();
  await expect(page.getByLabel("Заметки").last()).toBeVisible();
  await page.getByRole("button", { name: "Закрыть" }).click();

  await page.getByTitle("Записать на пробное").first().click();
  await expect(
    page.getByRole("heading", { name: "Записать на пробное занятие" }),
  ).toBeVisible();
  await expect(page.getByLabel("К обычному занятию")).toBeChecked();
  await expect(page.getByLabel("Дата занятия")).toBeVisible();
  await expect(page.getByLabel("Фильтр по преподавателю")).toBeVisible();
  await expect(page.getByLabel("Фильтр по филиалу")).toBeVisible();
  await expect(page.getByLabel("Фильтр по группе или курсу")).toBeVisible();
  await expect(page.getByLabel("Обычное занятие")).toContainText(
    "5 постоянных + 1 отработок + 1 пробных · свободно 1 из 8",
  );
  await page.getByLabel("Отдельное пробное").click();
  await expect(page.getByLabel("Кабинет")).toContainText("Без кабинета");
});
