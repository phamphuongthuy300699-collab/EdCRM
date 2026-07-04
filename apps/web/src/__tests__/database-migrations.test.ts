import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("Database production safety migrations", () => {
  it("enforces group capacity at the database boundary", () => {
    const migrationsDir = path.join(process.cwd(), "../../supabase/migrations");
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
});
