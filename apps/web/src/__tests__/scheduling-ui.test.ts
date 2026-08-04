import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("shared scheduling UI", () => {
  it("uses one explicit attendance roster in admin lesson and teacher cabinet", () => {
    const roster = read("src/features/scheduling/AttendanceRoster.tsx");
    expect(roster).toContain("Не отмечено");
    expect(roster).toContain("Пропуск уважительный");
    expect(roster).toContain("Опоздал");
    expect(read("src/app/(crm)/crm/lessons/[sessionId]/page.tsx")).toContain("<AttendanceRoster");
    expect(read("src/app/teacher/page.tsx")).toContain("<AttendanceRoster");
  });

  it("shows concrete sessions and operational actions to staff", () => {
    const workspace = read("src/features/scheduling/ScheduleWorkspace.tsx");
    expect(workspace).toContain("Перенести");
    expect(workspace).toContain("Отменить");
    expect(workspace).toContain("Добавить занятие");
    expect(workspace).toContain('action: "create_session"');
    expect(workspace).toContain("Уведомления MAX");
    expect(read("src/app/(crm)/crm/lessons/page.tsx")).toContain("<ScheduleWorkspace");
  });
});
