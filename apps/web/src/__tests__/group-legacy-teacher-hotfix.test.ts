import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  databaseUuidSchema,
  scheduleActionSchema,
  scheduleValidationPayload,
} from "@/features/scheduling/schemas";
import {
  groupStatuses,
  normalizeGroupStatus,
  parseScheduleText,
} from "@/features/scheduling/group-editor";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");
const legacyTeacherId = "a2222222-e222-3333-4444-555555555555";

const saveGroupPayload = (teacherId: string) => ({
  action: "save_group",
  groupId: "fc65dfe3-934f-423f-a8f9-07319c37a0a1",
  group: {
    title: "1 группа (соревновательная)",
    courseId: "3d0d97b0-cbe6-444a-a006-2c5e533ebbbd",
    teacherId,
    status: "draft",
    capacity: 8,
  },
  rules: parseScheduleText("Вт / Чт 13:00"),
  rebuildFuture: true,
});

describe("group legacy teacher hotfix", () => {
  it("proves strict RFC UUID validation rejected the production teacher ID", () => {
    expect(z.string().uuid().safeParse(legacyTeacherId).success).toBe(false);
  });

  it("accepts a canonical PostgreSQL UUID without RFC version restrictions", () => {
    expect(databaseUuidSchema.safeParse(legacyTeacherId).success).toBe(true);
    expect(scheduleActionSchema.safeParse(saveGroupPayload(legacyTeacherId)).success).toBe(true);
  });

  it("uses the database UUID contract for other persisted schedule identities", () => {
    const legacyGroupId = "f2222222-e222-3333-4444-555555555555";
    const legacyCourseId = "c2222222-e222-3333-4444-555555555555";
    const legacyBranchId = "b2222222-e222-3333-4444-555555555555";
    const legacyRoomId = "d2222222-e222-3333-4444-555555555555";
    expect(scheduleActionSchema.safeParse({
      ...saveGroupPayload(legacyTeacherId),
      groupId: legacyGroupId,
      group: {
        ...saveGroupPayload(legacyTeacherId).group,
        courseId: legacyCourseId,
        branchId: legacyBranchId,
        roomId: legacyRoomId,
      },
    }).success).toBe(true);
    expect(scheduleActionSchema.safeParse({
      action: "start_session",
      sessionId: legacyGroupId,
    }).success).toBe(true);
  });

  it("still rejects malformed database identities", () => {
    expect(databaseUuidSchema.safeParse("teacher-not-a-uuid").success).toBe(false);
    expect(scheduleActionSchema.safeParse(saveGroupPayload("teacher-not-a-uuid")).success).toBe(false);
  });

  it("maps validation failures to safe useful API fields", () => {
    const parsed = scheduleActionSchema.safeParse(saveGroupPayload("teacher-not-a-uuid"));
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(scheduleValidationPayload(parsed.error)).toEqual({
      ok: false,
      code: "INVALID_SCHEDULE_OPERATION",
      error: "Некорректный преподаватель",
      fieldErrors: { "group.teacherId": "Некорректный преподаватель" },
    });
  });

  it("parses Tuesday and Thursday at 13:00 with current one-hour duration", () => {
    expect(parseScheduleText("Вт / Чт 13:00")).toEqual([
      { weekday: 2, starts_at: "13:00:00", ends_at: "14:00:00" },
      { weekday: 4, starts_at: "13:00:00", ends_at: "14:00:00" },
    ]);
  });

  it("preserves all editable group statuses", () => {
    expect(groupStatuses).toEqual(["active", "draft", "paused", "closed"]);
    for (const status of groupStatuses) expect(normalizeGroupStatus(status)).toBe(status);
  });

  it("loads current status and sends it from the edit form", () => {
    const groupsPage = read("src/app/(crm)/crm/groups/page.tsx");
    expect(groupsPage).toContain("setEditStatus(normalizeGroupStatus(group.status))");
    expect(groupsPage).toContain("status: editStatus");
    for (const label of ["Активная", "Черновик", "Приостановлена", "Закрыта"]) {
      expect(groupsPage).toContain(label);
    }
  });

  it("keeps enrollment group dropdowns active-only", () => {
    const studentsPage = read("src/app/(crm)/crm/students/page.tsx");
    const studentPage = read("src/app/(crm)/crm/students/[studentId]/page.tsx");
    expect(studentsPage).toMatch(/\.from\("groups"\)[\s\S]*?\.eq\("status", "active"\)/);
    expect(studentPage).toMatch(/\.from\("groups"\)[\s\S]*?\.eq\("status", "active"\)/);
  });
});
