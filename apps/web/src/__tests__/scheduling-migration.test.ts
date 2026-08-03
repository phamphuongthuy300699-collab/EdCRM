import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("scheduling attendance migration", () => {
  const migration = fs.readFileSync(path.resolve(process.cwd(), "../../supabase/migrations/20260804000001_scheduling_attendance_makeups.sql"), "utf8");

  it("links rescheduled sessions and permits more than one lesson per day", () => {
    expect(migration).toContain("rescheduled_from_session_id");
    expect(migration).toContain("session_kind");
    expect(migration).toContain("drop constraint if exists lesson_sessions_group_id_lesson_date_key");
    expect(migration).toContain("on public.lesson_sessions (group_id, starts_at)");
  });

  it("stores explicit attendance and makeup lifecycle", () => {
    expect(migration).toContain("attendance_status");
    expect(migration).toContain("create table if not exists public.makeup_assignments");
    expect(migration).toContain("source_attendance_id");
    expect(migration).toContain("target_session_id");
    expect(migration).toContain("requested_by_guardian_id");
  });

  it("connects schedule events to the existing notification outbox", () => {
    expect(migration).toContain("alter table public.notification_outbox");
    expect(migration).toContain("student_id");
    expect(migration).toContain("lesson_session_id");
    expect(migration).toContain("makeup_assignments_select_guardian");
    expect(migration).toContain("notification_outbox_guardian_student_session_template_key");
    expect(migration).toContain("attempt_count integer not null default 0");
    expect(migration).toContain("next_attempt_at timestamptz");
  });
});
