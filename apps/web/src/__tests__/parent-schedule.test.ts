import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("parent schedule contour", () => {
  it("loads guardian-scoped concrete sessions and makeup state", () => {
    const route = read("src/app/api/parent/schedule/route.ts");
    expect(route).toContain("guardian_users");
    expect(route).toContain("student_guardians");
    expect(route).toContain("lesson_sessions");
    expect(route).toContain("makeup_assignments");
  });

  it("renders real changed/cancelled lessons and makeup state instead of recurrence math", () => {
    const page = read("src/app/parent/page.tsx");
    expect(page).toContain('/api/parent/schedule');
    expect(page).toContain("Ближайшие занятия");
    expect(page).toContain("Отработка");
    expect(page).not.toContain("function getNextClass");
  });
});
