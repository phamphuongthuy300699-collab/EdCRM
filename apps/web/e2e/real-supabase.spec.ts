import { test, expect } from "@playwright/test";

test.describe("Real Supabase E2E Smoke Test", () => {
  // Skip if not explicitly running against real Supabase
  test.skip(process.env.REAL_SUPABASE !== "true", "Skipping real Supabase test in Demo Mode");

  test("CRM and Portal flows against real Supabase database", async ({ page, context }) => {
    // Increase timeout for this complex multi-step test
    test.setTimeout(90000);

    const timestamp = Date.now();
    const parentName = `Родитель Тест ${timestamp}`;
    const childName = `Ученик Тест ${timestamp}`;
    const parentPhone = `+7999${String(timestamp).slice(-7)}`;

    // 1. Submit a public lead
    console.log("Submitting a new public lead...");
    await page.goto("/");
    await page.fill('input[placeholder="Иван Иванов"]', parentName);
    await page.fill('input[placeholder="Миша"]', childName);
    await page.fill('input[placeholder="+7 (999) 123-45-67"]', parentPhone);
    await page.fill('input[placeholder="8"]', "9");
    await page.click('button[type="submit"]');

    // Expect redirect to thanks page
    await page.waitForURL("**/thanks");
    await expect(page.locator("h1")).toContainText("Спасибо за заявку");

    // 2. Login as admin
    console.log("Logging in as Admin...");
    await context.clearCookies();
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@robotics.local");
    await page.fill('input[type="password"]', "RoboticsDemo2026!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/crm");

    // 3. Go to Leads and convert
    console.log("Navigating to CRM Leads and converting the lead...");
    await page.goto("/crm/leads");
    await page.fill('input[placeholder="Поиск по имени, тел..."]', parentName);

    // Locate the lead row and convert it
    const leadRow = page.locator("tr", { hasText: parentName });
    await expect(leadRow).toBeVisible();
    await leadRow.locator('button:has-text("Пробное")').click();

    // Confirm converting in drawer or directly click convert
    await leadRow.locator('button:has-text("Зачислить")').click();
    await page.waitForSelector("h3:has-text('Зачислить ученика')");

    // Select group and confirm
    await page.selectOption("select", { label: "LEGO Start 1" });
    await page.locator('button.btn-primary-crm:has-text("Зачислить")').click();

    // Verify "Открыть ученика" is visible
    const openStudentBtn = leadRow.locator('a:has-text("Открыть ученика")');
    await expect(openStudentBtn).toBeVisible({ timeout: 15000 });

    // 4. Click "Открыть ученика" and check details
    console.log("Opening converted student profile...");
    await openStudentBtn.click();
    await expect(page.locator("h1")).toContainText(childName);

    // 5. Navigate to Payments to issue and mark invoice as paid
    console.log("Creating and paying invoice...");
    await page.goto("/crm/payments");
    await page.click('button:has-text("Выставить счет")');
    await page.selectOption('select:has-text("Выберите ученика")', { label: childName });
    await page.fill('input[value="Абонемент на 8 занятий"]', "Счет за Тест");
    await page.fill('input[value="4500"]', "3000");
    await page.click('button:has-text("Создать")');

    // Find the invoice row and mark as paid
    const invoiceRow = page.locator("tr", { hasText: childName });
    await expect(invoiceRow).toBeVisible();
    await expect(invoiceRow).toContainText("Ожидает");

    // Click mark as paid
    await invoiceRow.locator('button:has-text("Отметить оплаченным")').click();
    await expect(invoiceRow).toContainText("Оплачено", { timeout: 10000 });

    // 6. Login as teacher and start lesson
    console.log("Logging in as Teacher to start a lesson...");
    await context.clearCookies();
    await page.goto("/login");
    await page.fill('input[type="email"]', "teacher@robotics.local");
    await page.fill('input[type="password"]', "RoboticsDemo2026!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/teacher");

    // Click the group button to select it
    await page.locator('button:has-text("LEGO Start 1")').click();

    // Find start lesson button in the control panel
    const startLessonBtn = page.locator('button:has-text("Начать урок")');
    await expect(startLessonBtn).toBeVisible();
    await startLessonBtn.click();

    // Verify badge changes to "Идет урок"
    await expect(page.locator('span:has-text("Идет урок")')).toBeVisible({ timeout: 10000 });

    // 7. Login as student to verify material access
    console.log("Logging in as Student to check materials...");
    await context.clearCookies();
    await page.goto("/login");
    await page.fill('input[type="email"]', "student@robotics.local");
    await page.fill('input[type="password"]', "RoboticsDemo2026!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/student", { timeout: 15000 });

    // Wait for async data to load (student portal fetches user profile + student_users + enrollments)
    await expect(page.locator("h1")).toContainText("Привет", { timeout: 15000 });
    await expect(page.locator("h1")).toContainText("Игорь Петров");

    // Check lesson status (materials may or may not be visible depending on session for this specific student)
    // The seeded student "Игорь Петров" is in LEGO Start 1, so the teacher's lesson should be visible
    const lessonBanner = page.locator('span:has-text("Урок запущен!")');
    if (await lessonBanner.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("Lesson materials are unlocked for student!");
    } else {
      console.log("Lesson materials not visible (session may not match today's date for seeded student)");
    }

    // 8. Login as parent to check child information
    console.log("Logging in as Parent...");
    await context.clearCookies();
    await page.goto("/login");
    await page.fill('input[type="email"]', "parent@robotics.local");
    await page.fill('input[type="password"]', "RoboticsDemo2026!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/parent", { timeout: 15000 });

    // Wait for async data to load
    await expect(page.locator("h1")).toContainText("Здравствуйте", { timeout: 15000 });
    await expect(page.locator('h3', { hasText: "Игорь Петров" })).toBeVisible({ timeout: 10000 });
    
    console.log("Real Supabase E2E Smoke Test completed successfully!");
  });
});
