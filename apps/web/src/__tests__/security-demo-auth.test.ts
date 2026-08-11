import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isDemoAuthBypassAllowed } from "@/shared/utils/demo-auth";

vi.mock("@/shared/db/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));

import { requireCrmStaff } from "@/app/api/crm/_shared";

const root = path.resolve(__dirname, "..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

describe("server-only demo authorization", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("never allows Docker production bypass from the public demo flag", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    vi.stubEnv("DEMO_AUTH_BYPASS", "true");
    vi.stubEnv("VERCEL_ENV", "");
    expect(isDemoAuthBypassAllowed()).toBe(false);
  });

  it("returns 401 from a CRM API guard under the production demo-flag attack", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    vi.stubEnv("DEMO_AUTH_BYPASS", "true");
    vi.stubEnv("VERCEL_ENV", "");
    const result = await requireCrmStaff();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("requires the server-only flag in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    vi.stubEnv("DEMO_AUTH_BYPASS", "false");
    expect(isDemoAuthBypassAllowed()).toBe(false);
    vi.stubEnv("DEMO_AUTH_BYPASS", "true");
    expect(isDemoAuthBypassAllowed()).toBe(true);
  });

  it("allows an explicit Vercel preview bypass", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("DEMO_AUTH_BYPASS", "true");
    expect(isDemoAuthBypassAllowed()).toBe(true);
  });

  it("uses the shared predicate in every privileged demo guard", () => {
    for (const file of [
      "middleware.ts",
      "app/api/crm/_shared.ts",
      "app/api/crm/media/route.ts",
      "app/api/crm/staff/_shared.ts",
      "app/api/crm/parent-access/_shared.ts",
    ]) {
      const source = read(file);
      expect(source).toContain("isDemoAuthBypassAllowed");
      expect(source).not.toMatch(/if \(isDemoMode\(\)\)\s*\{\s*return \{ ok: true/);
    }
  });
});
