import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("transactional group schedule replacement", () => {
  it("validates, scopes and safely rebuilds twelve weeks of rule-backed sessions", () => {
    const migration = read("../../supabase/migrations/20260804000002_sync_group_schedule.sql");
    expect(migration).toContain("replace_group_schedule");
    expect(migration).toContain("p_organization_id");
    expect(migration).toContain("for update");
    expect(migration).toContain("weekday not between 1 and 7");
    expect(migration).toContain("ends_at <= starts_at");
    expect(migration).toMatch(/count\(\*\)[\s\S]*<>[\s\S]*count\(distinct/);
    expect(migration).toContain("interval '12 weeks'");
    expect(migration).toContain("status = 'planned'");
    expect(migration).toContain("session_kind = 'regular'");
    expect(migration).toContain("schedule_rule_id is not null");
    expect(migration).toContain("rescheduled_from_session_id is null");
    expect(migration).toContain("on conflict (group_id, starts_at) do nothing");
    expect(migration).toContain("conflicts with another lesson");
  });

  it("exposes one authorized RPC action and both editors offer explicit rebuild control", () => {
    const route = read("src/app/api/crm/schedule/route.ts");
    expect(route).toContain('action: z.literal("replace_group_rules")');
    expect(route).toContain('admin.rpc("replace_group_schedule"');
    expect(route).toContain("adminRoles.has(access.role)");
    for (const file of ["src/app/(crm)/crm/settings/page.tsx", "src/app/(crm)/crm/groups/page.tsx"]) {
      const source = read(file);
      expect(source).toContain("Пересчитать будущие занятия");
      expect(source).toContain('action: "replace_group_rules"');
    }
  });
});
