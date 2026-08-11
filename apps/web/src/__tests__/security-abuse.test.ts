import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, clearRateLimits } from "@/lib/security/rate-limit";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

describe("bounded application rate limiter", () => {
  beforeEach(clearRateLimits);

  it("allows a bounded window and returns Retry-After", () => {
    expect(checkRateLimit({ key: "lead:ip", limit: 2, windowMs: 60_000, now: 1_000 }).allowed).toBe(true);
    expect(checkRateLimit({ key: "lead:ip", limit: 2, windowMs: 60_000, now: 2_000 }).allowed).toBe(true);
    expect(checkRateLimit({ key: "lead:ip", limit: 2, windowMs: 60_000, now: 3_000 })).toMatchObject({ allowed: false, retryAfter: 58 });
  });

  it("opens a new window and keeps storage bounded", () => {
    checkRateLimit({ key: "lead:ip", limit: 1, windowMs: 1_000, now: 1_000 });
    expect(checkRateLimit({ key: "lead:ip", limit: 1, windowMs: 1_000, now: 2_001 }).allowed).toBe(true);
    for (let index = 0; index < 2_000; index += 1) checkRateLimit({ key: `key:${index}`, limit: 1, windowMs: 1_000, now: 3_000, maxKeys: 100 });
    expect(checkRateLimit({ key: "final", limit: 1, windowMs: 1_000, now: 5_000, maxKeys: 100 }).size).toBeLessThanOrEqual(100);
  });

  it("throttles staff resets, notification workers, return checks and callbacks", () => {
    expect(read("app/api/crm/staff/reset-password/route.ts")).toContain("checkRateLimit");
    expect(read("app/api/jobs/notifications/process/route.ts")).toContain("checkRateLimit");
    expect(read("app/api/payments/alfabank/return-status/route.ts")).toContain("checkRateLimit");
    expect(read("app/api/payments/alfabank/callback/route.ts")).toContain("alfa-callback:order:");
  });
});
