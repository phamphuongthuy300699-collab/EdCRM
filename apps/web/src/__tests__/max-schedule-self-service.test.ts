import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("MAX schedule self-service", () => {
  const route = fs.readFileSync(path.resolve(process.cwd(), "src/app/api/bots/max/webhook/route.ts"), "utf8");

  it("offers guardian-scoped concrete schedule in the main menu", () => {
    expect(route).toContain('text: "Расписание", payload: "Расписание"');
    expect(route).toContain("async function sendSchedule");
    expect(route).toContain('from("student_guardians")');
    expect(route).toContain('from("lesson_sessions")');
    expect(route).toContain('from("makeup_assignments")');
    expect(route).toContain('action === "schedule"');
    expect(route).toContain("const weekUntil");
    expect(route).toContain('.lte("starts_at", weekUntil.toISOString())');
    expect(route).toContain("Расписание на ближайшие 7 дней");
  });
});
