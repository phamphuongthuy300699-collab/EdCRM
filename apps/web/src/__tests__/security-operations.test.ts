import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../..");
const appRoot = path.resolve(__dirname, "..");
const readRepo = (relative: string) => fs.readFileSync(path.join(repoRoot, relative), "utf8");
const readApp = (relative: string) => fs.readFileSync(path.join(appRoot, relative), "utf8");

describe("security operations contracts", () => {
  it("keeps provider secrets masked while preserving MAX subscription workflow", () => {
    const route = readApp("app/api/crm/bot-settings/max/route.ts");
    const settings = readApp("app/(crm)/crm/settings/page.tsx");
    expect(route).toContain("webhookSecretConfigured");
    expect(settings).toContain("webhookSecretConfigured");
    expect(settings).toContain("maxSettings.webhookSecretConfigured || maxSettings.webhookSecret");
  });

  it("audits finance and provider-setting mutations without persisting secrets", () => {
    const finance = readApp("app/api/crm/finance/route.ts");
    const reconcile = readApp("app/api/crm/finance/reconcile/route.ts");
    const alfa = readApp("app/api/crm/payment-settings/alfabank/route.ts");
    const max = readApp("app/api/crm/bot-settings/max/route.ts");
    for (const source of [finance, reconcile, alfa, max]) expect(source).toContain("writeSecurityAudit");
    expect(alfa).not.toContain("metadata: { apiPassword");
    expect(max).not.toContain("metadata: { botToken");
  });

  it("provides a PII-free health endpoint and hardened production container", () => {
    const health = readApp("app/api/health/route.ts");
    const dockerfile = readRepo("Dockerfile");
    const compose = readRepo("docker-compose.prod.yml");
    expect(health).toContain("status: \"ok\"");
    expect(health).not.toMatch(/email|phone|student|guardian|token|secret/i);
    expect(dockerfile).toContain("HEALTHCHECK");
    expect(compose).toContain("no-new-privileges:true");
    expect(compose).toContain("cap_drop:");
    expect(compose).toContain("- ALL");
    expect(compose).toContain("init: true");
  });
});
