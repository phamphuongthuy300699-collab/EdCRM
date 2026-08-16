import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const screenshotDir = path.resolve(process.cwd(), "../../docs/media/operations-ux");
fs.mkdirSync(screenshotDir, { recursive: true });

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}

async function mockSupabaseRest(page: Page) {
  await page.route("https://placeholder.supabase.co/rest/v1/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/0" }, body: "[]" });
  });
}

async function mockSchedule(page: Page) {
  await page.route("**/api/crm/schedule?**", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      ok: true,
      sessions: [{ id: "11111111-1111-4111-8111-111111111111", group_id: "22222222-2222-4222-8222-222222222222", teacher_id: "33333333-3333-4333-8333-333333333333", room_id: "44444444-4444-4444-8444-444444444444", starts_at: new Date(new Date().setHours(16, 0, 0, 0)).toISOString(), ends_at: new Date(new Date().setHours(17, 30, 0, 0)).toISOString(), status: "planned", session_kind: "regular", groups: { title: "Тестовая группа", branch_id: "55555555-5555-4555-8555-555555555555" }, profiles: { full_name: "Тестовый преподаватель" }, rooms: { name: "Кабинет 1" } }],
      groups: [{ id: "22222222-2222-4222-8222-222222222222", title: "Тестовая группа" }],
      teachers: [{ id: "33333333-3333-4333-8333-333333333333", name: "Тестовый преподаватель" }],
      branches: [{ id: "55555555-5555-4555-8555-555555555555", name: "Тестовый филиал" }],
      rooms: [{ id: "44444444-4444-4444-8444-444444444444", name: "Кабинет 1", branch_id: "55555555-5555-4555-8555-555555555555" }],
      makeups: [], notificationEvents: {},
    }) });
  });
}

test.describe("operations UX visual baselines", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(process.env.REAL_SUPABASE === "true", "Uses disposable demo data only");

  for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 800 }]) {
    test(`CRM dialogs fit ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await mockSupabaseRest(page);
      await page.goto("/crm/students", { waitUntil: "domcontentloaded" });
      const studentDialog = page.getByRole("dialog", { name: "Добавить ученика вручную" });
      await expect(async () => {
        await page.getByRole("button", { name: "Создать ученика" }).click();
        await expect(studentDialog).toBeVisible({ timeout: 1_000 });
      }).toPass({ timeout: 15_000 });
      await studentDialog.locator("input").evaluateAll((inputs) => {
        for (const input of inputs) input.setAttribute("placeholder", "Заполните поле");
      });
      const studentBox = await studentDialog.boundingBox();
      expect(studentBox && studentBox.y + studentBox.height <= viewport.height).toBe(true);
      await expect(studentDialog.getByRole("button", { name: "Создать", exact: true })).toBeVisible();
      await studentDialog.screenshot({ path: path.join(screenshotDir, `crm-${viewport.width}-student-create.png`) });

      await page.goto("/crm/groups", { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Список учеников" }).first().click();
      const memberDrawer = page.getByRole("dialog").first();
      await expect(memberDrawer.getByText("Добавить ученика в группу")).toBeVisible();
      await memberDrawer.evaluate((drawer) => {
        for (const element of drawer.querySelectorAll("span, p, div")) {
          if (element.childElementCount === 0 && ["Игорь Петров", "Данил Соловьев"].includes(element.textContent?.trim() ?? "")) {
            element.textContent = "Тестовый ученик";
          }
        }
      });
      await memberDrawer.screenshot({ path: path.join(screenshotDir, `crm-${viewport.width}-group-members.png`) });
      await page.getByRole("button", { name: "Закрыть" }).click();
      await page.getByRole("button", { name: "Редактировать" }).first().click();
      const groupDialog = page.getByRole("dialog", { name: "Редактировать группу" });
      await expect(groupDialog).toBeVisible();
      await expect(groupDialog.getByRole("button", { name: "Сохранить", exact: true })).toBeVisible();
      await groupDialog.screenshot({ path: path.join(screenshotDir, `crm-${viewport.width}-group-edit.png`) });

      await mockSchedule(page);
      await page.goto("/crm/lessons", { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Перенести" }).click();
      const reschedule = page.getByRole("dialog", { name: "Перенести занятие" });
      await expect(reschedule).toBeVisible();
      await expect(reschedule.getByRole("button", { name: "Перенести", exact: true })).toBeVisible();
      await reschedule.screenshot({ path: path.join(screenshotDir, `crm-${viewport.width}-reschedule.png`) });
      await expectNoOverflow(page);
    });
  }

  for (const viewport of [{ width: 390, height: 844 }, { width: 430, height: 932 }]) {
    test(`teacher attendance fits ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/teacher", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { level: 1, name: "Рабочее место преподавателя", exact: true })).toBeVisible();
      const brandLogo = page.getByRole("img", { name: "Робокс" });
      await brandLogo.evaluate((image) => image.dispatchEvent(new Event("error")));
      await expect(brandLogo).toBeHidden();
      await page.screenshot({ path: path.join(screenshotDir, `teacher-${viewport.width}-home.png`), fullPage: true });
      await page.getByRole("button", { name: "Открыть занятие" }).click();
      await expect(page.locator(".attendance-roster article")).toHaveCount(8);
      await expect(page.locator(".attendance-roster article").first().getByRole("button", { name: "Был", exact: true })).toBeDisabled();
      await page.getByRole("button", { name: "Начать занятие" }).click();
      await page.screenshot({ path: path.join(screenshotDir, `teacher-${viewport.width}-attendance.png`), fullPage: true });
      const absentRow = page.locator(".attendance-roster article").nth(1);
      await absentRow.getByRole("button", { name: "Нет", exact: true }).click();
      await expect(page.getByText("Отмечено 0 из 8")).toBeVisible();
      await expect(page.getByRole("button", { name: "Сохранить" })).toBeDisabled();
      const excusedButton = absentRow.getByRole("button", { name: "Пропуск уважительный", exact: true });
      await excusedButton.evaluate((button) => button.scrollIntoView({ block: "center" }));
      await excusedButton.click();
      await absentRow.getByPlaceholder("Например: заболел").fill("Тестовая причина");
      await expect(page.getByText("Отмечено 1 из 8")).toBeVisible();
      await expect(page.getByRole("button", { name: "Завершить занятие" })).toBeDisabled();
      await page.screenshot({ path: path.join(screenshotDir, `teacher-${viewport.width}-absent.png`) });
      const undersized = await page.locator(".attendance-roster button").evaluateAll((buttons) => buttons.filter((button) => button.getBoundingClientRect().height < 44).length);
      expect(undersized).toBe(0);
      await expectNoOverflow(page);
    });
  }
});
