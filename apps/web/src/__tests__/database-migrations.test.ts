import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("Database production safety migrations", () => {
  const migrationsDir = path.join(process.cwd(), "../../supabase/migrations");

  it("enforces group capacity at the database boundary", () => {
    const migrationSql = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .map((file) => fs.readFileSync(path.join(migrationsDir, file), "utf8"))
      .join("\n");

    expect(migrationSql).toContain("prevent_group_capacity_overflow");
    expect(migrationSql).toContain("trg_prevent_group_capacity_overflow");
    expect(migrationSql).toContain("for update");
    expect(migrationSql).toContain("group_capacity_exceeded");
  });

  it("keeps legacy LMS migration executable instead of hiding production changes in comments", () => {
    const migration = fs.readFileSync(
      path.join(process.cwd(), "../../supabase/migrations/20260621000001_lms_sales_light.sql"),
      "utf8",
    );

    expect(migration).toContain("-- 9. Seed Demo Data directly in Migration");
    expect(migration).not.toContain("Demo data moved to supabase/seed.sql");
    expect(migration).not.toContain("Keep migrations structural: do not execute demo inserts here.");
    expect(migration).not.toMatch(/\/\*\s*-- 9\. Seed Demo Data directly in Migration/);
  });

  it("runs baseline Roboks seed fixup before later production migrations depend on it", () => {
    const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();
    const fixup = "20260701000000_baseline_roboks_seed_fixup.sql";

    expect(files).toContain(fixup);
    expect(files.indexOf(fixup)).toBeLessThan(files.indexOf("20260701000001_alfabank_payment_settings.sql"));
    expect(files.indexOf(fixup)).toBeLessThan(files.indexOf("20260701000005_rebrand_seed_data.sql"));
    expect(files.indexOf(fixup)).toBeLessThan(files.indexOf("20260701000006_discount_engine.sql"));

    const migration = fs.readFileSync(path.join(migrationsDir, fixup), "utf8");
    expect(migration).toContain("insert into public.organizations");
    expect(migration).toContain("insert into public.courses");
    expect(migration).toContain("a3848a60-a292-491a-85eb-7f2824cf4e77");
    expect(migration).toContain("4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a");
  });
});
