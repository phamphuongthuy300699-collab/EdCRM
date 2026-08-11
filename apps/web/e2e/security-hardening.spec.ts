import { expect, test } from "@playwright/test";

test.describe("security hardening boundaries", () => {
  test("serves browser security headers and a minimal health response", async ({ request }) => {
    const page = await request.get("/");
    expect(page.headers()["content-security-policy"]).toContain("default-src 'self'");
    expect(page.headers()["x-content-type-options"]).toBe("nosniff");
    expect(page.headers()["x-frame-options"]).toBe("DENY");

    const health = await request.get("/api/health");
    expect(health.ok()).toBeTruthy();
    expect(await health.json()).toEqual({ status: "ok" });
  });

  test("rejects a foreign-origin CRM mutation before authorization", async ({ request }) => {
    const response = await request.post("/api/crm/students/status", {
      headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
      data: { studentId: "00000000-0000-4000-8000-000000000001", status: "active" },
    });
    expect(response.status()).toBe(403);
    expect(await response.json()).toMatchObject({ code: "CSRF_ORIGIN_REJECTED" });
  });

  test("rejects client-controlled payment amount as an unknown field", async ({ request }) => {
    const response = await request.post("/api/payments/alfabank/create", {
      headers: { origin: "http://localhost:3001", "sec-fetch-site": "same-origin" },
      data: { invoiceId: "00000000-0000-4000-8000-000000000001", amount: 1 },
    });
    expect(response.status()).toBe(422);
    expect(await response.json()).toMatchObject({ code: "INVALID_INVOICE_ID" });
  });
});
