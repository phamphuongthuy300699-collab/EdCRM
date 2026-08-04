import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("CRM dashboard concrete lessons", () => {
  it("loads one organization-scoped dashboard API instead of synthesizing lessons from groups", () => {
    const page = read("src/app/(crm)/crm/page.tsx");
    expect(page).toContain('fetch("/api/crm/dashboard")');
    expect(page).not.toContain("group_schedule_rules");
    expect(page).not.toContain("Каб. 101");
    expect(page).toContain("На сегодня конкретные занятия не сформированы");
    expect(page).toContain("Демо-режим");
  });

  it("queries Moscow-today lesson_sessions with real teacher, room and per-group enrollment counts", () => {
    const route = read("src/app/api/crm/dashboard/route.ts");
    expect(route).toContain("requireCrmStaff");
    expect(route).toContain('from("lesson_sessions")');
    expect(route).toContain('timeZone: "Europe/Moscow"');
    expect(route).toContain('.eq("lesson_date", today)');
    expect(route).toContain('["planned", "live", "completed", "cancelled", "moved"]');
    expect(route).toContain('from("enrollments")');
    expect(route).toContain("group_id");
    expect(route).toContain("rooms(name)");
    expect(route).toContain("profiles(full_name)");
  });
});
