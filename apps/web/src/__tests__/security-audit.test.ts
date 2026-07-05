import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("security audit contracts", () => {
  it("does not create parent portal users with the public demo password", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/crm/leads/convert/route.ts"),
      "utf8",
    );

    expect(source).not.toContain('password: "demo"');
    expect(source).not.toContain("Creating auth user for parent portal");
    expect(source).not.toContain("Linked auth user to guardian_users");
  });

  it("checks group capacity before lead conversion enrollment", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/crm/leads/convert/route.ts"),
      "utf8",
    );

    expect(source).toContain(".from(\"groups\")");
    expect(source).toContain("capacity");
    expect(source).toContain(".from(\"enrollments\")");
    expect(source).toContain("В группе нет свободных мест");
    expect(source).toContain("group_capacity_exceeded");
  });
});
