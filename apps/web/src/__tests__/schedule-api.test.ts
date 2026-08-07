import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("CRM scheduling API contract", () => {
  it("keeps all schedule mutations behind organization-scoped staff auth", () => {
    const route = read("src/app/api/crm/schedule/route.ts");
    const lifecycle = read("../../supabase/migrations/20260807000003_lesson_session_lifecycle.sql");
    expect(route).toContain("requireCrmStaff");
    expect(route).toContain('action: z.literal("materialize")');
    expect(route).toContain('action: z.literal("create_session")');
    expect(route).toContain('action: z.literal("reschedule")');
    expect(route).toContain('action: z.literal("cancel")');
    expect(route).toContain('action: z.literal("schedule_makeup")');
    expect(route).toContain('action: z.literal("save_attendance")');
    expect(route).toContain('admin.rpc("save_lesson_attendance"');
    expect(lifecycle).toContain("status = 'completed'");
    expect(lifecycle).toContain("completed_at = coalesce(completed_at, now())");
    expect(route).toContain("access.organizationId");
    expect(route).toContain('templateKey: "lesson_scheduled"');
  });

  it("expands group and student events into guardian-specific outbox rows", () => {
    const server = read("src/features/scheduling/server.ts");
    expect(server).toContain("student_guardians");
    expect(server).toContain("notification_outbox");
    expect(server).toContain("guardian_id");
    expect(server).toContain("lesson_session_id");
    expect(server).toContain("template_key");
    expect(server).toContain('onConflict: "guardian_id,student_id,lesson_session_id,template_key"');
  });

  it("preserves the moved source and links the replacement session", () => {
    const route = read("src/app/api/crm/schedule/route.ts");
    const migration = read("../../supabase/migrations/20260804000001_scheduling_attendance_makeups.sql");
    expect(route).toContain('rpc("reschedule_lesson_session"');
    expect(migration).toContain("set status = 'moved'");
    expect(migration).toContain("rescheduled_from_session_id");
    expect(route).toContain("oldStartsAt");
    expect(route).toContain("пересекается с занятием преподавателя или кабинета");
    expect(route).toContain("Отменить можно только предстоящее занятие");
    expect(route).toContain("assignment.target_session_id === target.id");
  });
});
