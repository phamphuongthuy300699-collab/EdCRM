import { expect, test } from "@playwright/test";

async function mockEmptySiteEditorDatabase(page: import("@playwright/test").Page) {
  await page.route("https://placeholder.supabase.co/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const isOrganization = url.pathname.includes("/rest/v1/organizations");
    const wantsObject = request.headers().accept?.includes("application/vnd.pgrst.object+json");
    const body = isOrganization
      ? (wantsObject
          ? { id: "11111111-1111-4111-8111-111111111111", slug: "robotics-lipetsk", name: "EdCRM Demo" }
          : [{ id: "11111111-1111-4111-8111-111111111111", slug: "robotics-lipetsk", name: "EdCRM Demo" }])
      : (wantsObject ? null : []);
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

test.describe("CRM Site Editor Spec", () => {
  test("opens the existing home and media areas", async ({ page }) => {
    test.skip(process.env.REAL_SUPABASE === "true", "Skipping demo E2E in Real Mode");
    await mockEmptySiteEditorDatabase(page);
    await page.goto("/crm/site", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toContainText("Управление сайтом");
    await expect(page.getByText("Загрузка...")).toBeHidden({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /Контент главной/ })).toBeVisible();
    await page.getByRole("button", { name: /Медиа для сайта/ }).click();
    await expect(page.getByRole("heading", { name: "Медиа для сайта" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Изображения в блоках сайта" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Главная" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: "Первый экран" })).toBeVisible();
    await page.getByRole("tab", { name: "Контакты" }).click();
    await expect(page.getByRole("heading", { name: "Карта или общий вид" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Галерея контактов" })).toBeVisible();
    await page.getByRole("tab", { name: "Бренд и SEO" }).click();
    await expect(page.getByRole("heading", { name: "Логотип" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Изображение для соцсетей" })).toBeVisible();
    await page.getByRole("tab", { name: "Футер" }).click();
    await expect(page.getByRole("heading", { name: "Резервная схема проезда" })).toBeVisible();
  });

  test("edits a block image collection without deleting library files", async ({ page }) => {
    test.skip(process.env.REAL_SUPABASE === "true", "Skipping mocked media library in Real Mode");
    await mockEmptySiteEditorDatabase(page);
    const libraryFiles = [
      { name: "demo-one.png", path: "student-projects/demo-one.png", url: "/images/robot_sumo.png", usages: [{ kind: "site_block", label: "Блок сайта: Проекты учеников" }, { kind: "course", label: "Фон курса: Робототехника" }] },
      { name: "demo-two.png", path: "student-projects/demo-two.png", url: "/images/arduino_greenhouse.png" },
      { name: "demo-three.png", path: "student-projects/demo-three.png", url: "/images/classroom_lipetsk.png" },
    ];
    await page.route("**/api/crm/media?folder=student-projects", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ files: libraryFiles }) });
    });

    await page.goto("/crm/site", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Загрузка...")).toBeHidden({ timeout: 30_000 });
    await page.getByRole("button", { name: /Медиа для сайта/ }).click();
    const editor = page.locator('[data-block-key="home.student_projects"]');
    await expect(editor).toBeVisible({ timeout: 30_000 });

    await editor.getByRole("button", { name: "Добавить изображение" }).click();
    const picker = page.getByRole("dialog", { name: "Выбор изображения из медиатеки" });
    await picker.locator('[data-media-path="student-projects/demo-one.png"]').click();
    await expect(picker.getByText("Используется в 2 местах")).toBeVisible();
    await picker.locator('[data-media-path="student-projects/demo-two.png"]').click();
    await picker.getByRole("button", { name: "Добавить (2)" }).click();

    await expect(editor.locator('[data-image-path="student-projects/demo-one.png"]')).toBeVisible();
    await expect(editor.locator('[data-public-media-card="student-project"]').first()).toBeVisible();
    await editor.locator('[data-image-path="student-projects/demo-one.png"]').getByRole("button", { name: "Убрать из блока" }).click();
    await expect(editor.locator('[data-image-path="student-projects/demo-one.png"]')).toBeHidden();
    await editor.getByRole("button", { name: "Отменить удаление" }).click();
    await expect(editor.locator('[data-image-path="student-projects/demo-one.png"]')).toBeVisible();
    const secondImage = editor.locator('[data-image-path="student-projects/demo-two.png"]');
    await secondImage.getByRole("button", { name: "Заменить" }).click();
    await picker.locator('[data-media-path="student-projects/demo-three.png"]').click();
    await picker.getByRole("button", { name: "Заменить изображение" }).click();

    const replacement = editor.locator('[data-image-path="student-projects/demo-three.png"]');
    await replacement.getByRole("button", { name: /выше/i }).click();
    await expect(editor.locator("[data-image-position='1']")).toHaveAttribute("data-image-path", "student-projects/demo-three.png");

    await editor.getByLabel("Колонки: компьютер").fill("2");
    await editor.getByRole("button", { name: "Телефон" }).click();
    await expect(editor.locator('[data-preview-path="student-projects/demo-three.png"]')).toBeVisible();
    await editor.getByRole("button", { name: "Сохранить блок" }).click();
    await expect(page.getByText("Изображения блока «Проекты учеников» сохранены")).toBeVisible();

    await editor.getByRole("button", { name: "Добавить изображение" }).click();
    await expect(picker.locator('[data-media-path="student-projects/demo-two.png"]')).toBeVisible();
  });

  test("warns before leaving the site editor with unsaved media changes", async ({ page }) => {
    test.skip(process.env.REAL_SUPABASE === "true", "Skipping mocked media library in Real Mode");
    await mockEmptySiteEditorDatabase(page);
    await page.route("**/api/crm/media?folder=hero", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ files: [{ name: "hero.png", path: "hero/hero.png", url: "/images/classroom_lipetsk.png", usages: [] }] }) });
    });
    await page.goto("/crm/site", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Загрузка...")).toBeHidden({ timeout: 30_000 });
    await page.getByRole("button", { name: /Медиа для сайта/ }).click();
    await page.locator('section[aria-label="Первый экран"]').getByRole("button", { name: "Выбрать изображение" }).click();
    const picker = page.getByRole("dialog", { name: "Выбор изображения из медиатеки" });
    await picker.locator('[data-media-path="hero/hero.png"]').click();
    await picker.getByRole("button", { name: "Добавить" }).click();

    await page.getByRole("button", { name: /Контент главной/ }).click();
    const warning = page.getByRole("dialog", { name: "Есть несохранённые изменения" });
    await expect(warning).toBeVisible();
    await warning.getByRole("button", { name: "Отмена" }).click();
    await expect(page.getByRole("heading", { name: "Изображения в блоках сайта" })).toBeVisible();
  });

  test("keeps the block editor usable on a phone viewport", async ({ page }) => {
    test.skip(process.env.REAL_SUPABASE === "true", "Skipping demo E2E in Real Mode");
    await page.setViewportSize({ width: 390, height: 844 });
    await mockEmptySiteEditorDatabase(page);
    await page.goto("/crm/site", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Загрузка...")).toBeHidden({ timeout: 30_000 });
    await page.locator(".site-tab-nav-mobile select").selectOption("media");
    await expect(page.getByRole("heading", { name: "Изображения в блоках сайта" })).toBeVisible();
    await page.getByRole("tab", { name: "Контакты" }).click();
    await expect(page.getByRole("heading", { name: "Карта или общий вид" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Выбрать изображение" }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  });

  test("persists image order and layout to the public page on staging", async ({ page }) => {
    test.skip(process.env.REAL_SUPABASE !== "true" || !process.env.SITE_EDITOR_E2E_MEDIA_PATHS, "Requires an authenticated staging database and test-only media paths");
    const [firstPath, secondPath] = process.env.SITE_EDITOR_E2E_MEDIA_PATHS!.split(",").map((value) => value.trim());

    await page.goto("/crm/site", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Медиа для сайта/ }).click();
    const editor = page.locator('[data-block-key="home.student_projects"]');
    await editor.getByRole("button", { name: "Добавить изображение" }).click();
    const picker = page.getByRole("dialog", { name: "Выбор изображения из медиатеки" });
    await picker.locator(`[data-media-path="${firstPath}"]`).click();
    await picker.locator(`[data-media-path="${secondPath}"]`).click();
    await picker.getByRole("button", { name: /Добавить/ }).click();
    await editor.locator(`[data-image-path="${secondPath}"]`).getByRole("button", { name: /выше/i }).click();
    await editor.getByLabel("Колонки: компьютер").fill("2");
    await editor.getByRole("button", { name: "Сохранить блок" }).click();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const publicImages = page.locator("#projects img");
    await expect(publicImages.first()).toHaveAttribute("src", new RegExp(secondPath.split("/").pop()!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    await page.goto("/crm/site", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Медиа для сайта/ }).click();
    await page.locator('[data-block-key="home.student_projects"]').getByRole("button", { name: "Добавить изображение" }).click();
    await expect(page.locator(`[data-media-path="${firstPath}"]`)).toBeVisible();
  });
});
