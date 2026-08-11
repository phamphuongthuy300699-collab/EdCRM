import { describe, expect, it } from "vitest";
import { assertSameOriginMutation } from "@/lib/security/origin";
import fs from "node:fs";
import path from "node:path";

const request = (origin: string | null, site: string | null = null) => new Request("https://crm.example/api/crm/students/status", {
  method: "POST",
  headers: { ...(origin ? { origin } : {}), ...(site ? { "sec-fetch-site": site } : {}) },
});

describe("same-origin mutation defense", () => {
  it("accepts the canonical origin", () => {
    expect(assertSameOriginMutation(request("https://crm.example"), "https://crm.example")).toEqual({ ok: true });
  });

  it("rejects a cross-site origin", () => {
    expect(assertSameOriginMutation(request("https://evil.example", "cross-site"), "https://crm.example")).toMatchObject({ ok: false, status: 403 });
  });

  it("accepts same-origin browser metadata when Origin is absent", () => {
    expect(assertSameOriginMutation(request(null, "same-origin"), "https://crm.example")).toEqual({ ok: true });
  });

  it("rejects same-site subdomain requests when an exact Origin is absent", () => {
    expect(assertSameOriginMutation(request(null, "same-site"), "https://crm.example")).toMatchObject({ ok: false, status: 403 });
  });

  it("covers browser payment status mutations but not provider callbacks", () => {
    const middleware = fs.readFileSync(path.resolve(__dirname, "../middleware.ts"), "utf8");
    expect(middleware).toContain('"/api/payments/alfabank/return-status"');
    expect(middleware).not.toMatch(/cookiePaymentMutations[^;]+callback/s);
  });
});
