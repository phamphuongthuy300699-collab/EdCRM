import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { allAttendanceMarked, markAllPresent } from "@/features/scheduling/domain";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("teacher attendance", () => {
  const rows = [
    { studentId: "1", status: "unmarked" as const },
    { studentId: "2", status: "late" as const },
  ];

  it("bulk marks every roster student present", () => expect(markAllPresent(rows).map((row) => row.status)).toEqual(["present", "present"]));
  it("does not allow completion with unmarked attendance", () => expect(allAttendanceMarked(rows)).toBe(false));
  it("allows completion when every student is explicitly marked", () => expect(allAttendanceMarked(markAllPresent(rows))).toBe(true));
  it("allows an empty roster to follow the same lifecycle invariant as the database", () => expect(allAttendanceMarked([])).toBe(true));

  it("uses touch-first attendance controls and optional details", () => {
    const source = read("src/features/scheduling/AttendanceRoster.tsx");
    for (const label of ["Был", "Опоздал", "Нет", "Уважительно", "Без причины", "+ Комментарий", "Отработка", "Отметить всех присутствующими", "Отмечено"]) expect(source).toContain(label);
    expect(source).toContain("minHeight: 44");
    expect(source).not.toContain("<select");
    expect(source).toContain("setAbsenceOpen");
    expect(source).toContain("hasPendingAbsence");
    expect(source).toContain('update(row.studentId, { status: "unmarked" })');
  });
});

describe("lesson session lifecycle", () => {
  it("keeps start and complete inside one server transaction boundary", () => {
    const migration = read("../../supabase/migrations/20260807000003_lesson_session_lifecycle.sql");
    expect(migration).toContain("transition_lesson_session");
    expect(migration).toContain("for update");
    expect(migration).toContain("target_session.teacher_id <> p_actor_id");
    expect(migration).toContain("materials_unlocked = true");
    expect(migration).toContain("attendance_status = 'unmarked'");
    expect(migration).toContain("FUTURE FINANCE ATOMIC BOUNDARY");
  });

  it("exposes server actions without allowing teachers to mutate foreign sessions", () => {
    const route = read("src/app/api/crm/schedule/route.ts");
    const schemas = read("src/features/scheduling/schemas.ts");
    const attendanceMigration = read("../../supabase/migrations/20260807000005_atomic_attendance_save.sql");
    expect(schemas).toContain('action: z.literal("start_session")');
    expect(schemas).toContain('action: z.literal("complete_session")');
    expect(route).toContain('admin.rpc("transition_lesson_session"');
    expect(route).toContain("p_is_admin: adminRoles.has(access.role)");
    expect(route).toContain('admin.rpc("save_lesson_attendance"');
    expect(attendanceMigration).toContain("save_lesson_attendance");
    expect(attendanceMigration).toContain("for update");
    expect(attendanceMigration).toContain("target_session.status <> 'live'");
    expect(attendanceMigration).toContain("foreign_teacher_session");
    expect(attendanceMigration).toContain("attendance_student_not_in_roster");
    expect(attendanceMigration).toContain("on conflict (lesson_session_id, student_id)");
    expect(attendanceMigration).not.toContain("status = 'completed'");
    const lifecycleMigration = read("../../supabase/migrations/20260807000003_lesson_session_lifecycle.sql");
    expect(lifecycleMigration).toContain("update public.makeup_assignments");
    expect(lifecycleMigration).toContain("attendance_status in ('present', 'late')");
  });

  it("never falls back to demo teacher data on a production error or mutates sessions in the browser", () => {
    const page = read("src/app/teacher/page.tsx");
    const crmLesson = read("src/app/(crm)/crm/lessons/[sessionId]/page.tsx");
    expect(page).toContain("isDemoMode()");
    expect(page).toContain("teacher_id = auth.uid()");
    expect(page).not.toContain('.from("lesson_sessions").insert');
    expect(page).not.toContain('.from("lesson_sessions").update');
    expect(page).not.toContain("setGroups(demoGroups)");
    expect(page).toContain('disabled={selected.status !== "live"}');
    expect(crmLesson).toContain('disabled={session.status !== "live"}');
  });
});
