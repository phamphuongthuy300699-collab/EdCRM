import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { categorizeTeacherSessions } from "@/features/scheduling/teacher-portal";
import { teacherRateSchema, teacherRateValidationPayload } from "@/features/finance/teacher-rate-schema";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");
const legacyTeacherId = "a4444444-e222-3333-4444-555555555555";

const session = (id: string, startsAt: string, status: string, teacherId = legacyTeacherId) => ({
  id,
  starts_at: startsAt,
  status,
  teacher_id: teacherId,
});

describe("P0 teacher portal and legacy rate contracts", () => {
  it("keeps live sessions unresolved regardless of age and separates Moscow calendar sections", () => {
    const result = categorizeTeacherSessions([
      session("live-yesterday", "2026-08-15T10:00:00+03:00", "live"),
      session("live-old", "2026-07-20T10:00:00+03:00", "live"),
      session("today", "2026-08-16T12:00:00+03:00", "planned"),
      session("upcoming", "2026-08-20T12:00:00+03:00", "planned"),
      session("history", "2026-08-10T12:00:00+03:00", "completed"),
      session("cancelled", "2026-08-16T15:00:00+03:00", "cancelled"),
    ], "2026-08-16");
    expect(new Set(result.unfinished.map((item) => item.id))).toEqual(new Set(["live-old", "live-yesterday"]));
    expect(result.today.map((item) => item.id)).toEqual(["today"]);
    expect(result.upcoming.map((item) => item.id)).toEqual(["upcoming"]);
    expect(result.history.map((item) => item.id)).toEqual(["history"]);
  });

  it("shows a live lesson in both unresolved and today when it belongs to today", () => {
    const result = categorizeTeacherSessions([
      session("today-live", "2026-08-16T12:00:00+03:00", "live"),
    ], "2026-08-16");
    expect(result.unfinished.map((item) => item.id)).toEqual(["today-live"]);
    expect(result.today.map((item) => item.id)).toEqual(["today-live"]);
  });

  it("accepts the production legacy teacher UUID, 2500 and a backdated effective date", () => {
    expect(teacherRateSchema.safeParse({
      teacherId: legacyTeacherId,
      mode: "per_lesson",
      rate: 2500,
      effectiveFrom: "2026-08-01",
    }).success).toBe(true);
  });

  it("rejects malformed teacher IDs with a sanitized field-specific error", () => {
    const parsed = teacherRateSchema.safeParse({
      teacherId: "not-a-teacher",
      mode: "per_lesson",
      rate: 2500,
      effectiveFrom: "2026-08-01",
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(teacherRateValidationPayload(parsed.error)).toEqual({
      ok: false,
      code: "INVALID_TEACHER_RATE",
      error: "Некорректный преподаватель",
      fieldErrors: { teacherId: "Некорректный преподаватель" },
    });
  });

  it("uses database UUID validation for teacher identity in period payroll actions", () => {
    const financeRoute = read("src/app/api/crm/finance/route.ts");
    expect(financeRoute).toContain("teacherId: databaseUuidSchema");
    expect(financeRoute).not.toContain("teacherId: z.string().uuid()");
  });

  it("loads unresolved sessions separately and keeps canonical teacher scoping", () => {
    const route = read("src/app/api/crm/schedule/route.ts");
    expect(route).toContain('eq("status", "live")');
    expect(route).toContain("access.staffProfileId");
    expect(route).toContain("mergeTeacherScheduleSessions");
  });

  it("keeps lesson conduct and homework behind server authorization", () => {
    const sessionRoute = read("src/app/api/crm/schedule/session/[sessionId]/route.ts");
    const homeworkRoute = read("src/app/api/crm/schedule/session/[sessionId]/homework/route.ts");
    expect(sessionRoute).toContain("lesson_materials");
    expect(sessionRoute).toContain("homework_templates");
    expect(sessionRoute).toContain("homework_assignments");
    expect(homeworkRoute).toContain("access.staffProfileId");
    expect(homeworkRoute).toContain('session.teacher_id !== access.staffProfileId');
    expect(homeworkRoute).toContain('eq("organization_id", access.organizationId)');
    expect(homeworkRoute).toContain('["planned", "live"].includes(session.status)');
    expect(homeworkRoute).not.toContain("groupId");
    expect(sessionRoute).toContain("students(id, full_name)");
    expect(sessionRoute).toContain("for (const mark of attendance || [])");
    expect(sessionRoute).toContain("canAssignHomework");
  });
});
