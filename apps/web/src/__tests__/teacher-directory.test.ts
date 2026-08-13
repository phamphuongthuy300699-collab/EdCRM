import { describe, expect, it } from "vitest";
import { activeTeacherOptions, resolveTeacherName } from "@/features/staff/teachers";
import fs from "node:fs";
import path from "node:path";

const staff = [
  { user_id: "t1", full_name: "Каноническое имя", role: "teacher", is_active: true },
  { user_id: "t2", full_name: "Отключён", role: "teacher", is_active: false },
  { user_id: "m1", full_name: "Менеджер", role: "manager", is_active: true },
];

describe("canonical teacher directory", () => {
  it("offers only active teacher memberships", () => {
    expect(activeTeacherOptions(staff)).toEqual([{ id: "t1", full_name: "Каноническое имя" }]);
  });

  it("resolves by teacher id before using the embedded fallback", () => {
    expect(resolveTeacherName("t1", staff, "Старое имя")).toBe("Каноническое имя");
    expect(resolveTeacherName("legacy", staff, "Legacy имя")).toBe("Legacy имя");
    expect(resolveTeacherName(null, staff)).toBe("Не назначен");
  });

  it("uses a manager-readable sanitized directory on the groups page", () => {
    const groups = fs.readFileSync(path.resolve(process.cwd(), "src/app/(crm)/crm/groups/page.tsx"), "utf8");
    const route = fs.readFileSync(path.resolve(process.cwd(), "src/app/api/crm/staff/teachers/route.ts"), "utf8");
    expect(groups).toContain('/api/crm/staff/teachers');
    expect(route).toContain('new Set(["owner", "admin", "manager"])');
    expect(route).not.toContain("teacher_pay_rules");
    expect(route).not.toContain("auth.admin");
  });
});
