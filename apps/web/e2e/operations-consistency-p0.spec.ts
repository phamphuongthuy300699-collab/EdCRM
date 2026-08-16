import { expect, test } from "@playwright/test";

test.describe("P0 operations consistency", () => {
  test.skip(process.env.REAL_SUPABASE === "true", "Uses deterministic application fixtures");

  test("schedule opens on the current Moscow week without clicking Week", async ({ page }) => {
    let initialRange: { from: string; to: string } | null = null;
    await page.route("**/api/crm/schedule?**", async (route) => {
      const url = new URL(route.request().url());
      const from = url.searchParams.get("dateFrom") || "";
      const to = url.searchParams.get("dateTo") || "";
      if (!initialRange) initialRange = { from, to };
      const sessionDate = new Date(`${from}T12:00:00+03:00`);
      sessionDate.setDate(sessionDate.getDate() + 5);
      const sessions = from === to ? [] : [{
        id: "11111111-1111-4111-8111-111111111111",
        group_id: "22222222-2222-4222-8222-222222222222",
        starts_at: sessionDate.toISOString(),
        ends_at: new Date(sessionDate.getTime() + 90 * 60_000).toISOString(),
        status: "planned",
        session_kind: "regular",
        groups: { title: "Занятие текущей недели" },
      }];
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, sessions, groups: [], teachers: [], branches: [], rooms: [], makeups: [], notificationEvents: {} }) });
    });

    await page.goto("/crm/lessons", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Занятие текущей недели")).toBeVisible();
    expect(initialRange).not.toBeNull();
    const from = new Date(`${initialRange!.from}T00:00:00Z`);
    const to = new Date(`${initialRange!.to}T00:00:00Z`);
    expect((to.getTime() - from.getTime()) / 86_400_000).toBe(6);

    await page.getByRole("button", { name: "Сегодня" }).click();
    await expect(page.getByText("На сегодня занятий нет")).toBeVisible();
  });
});
