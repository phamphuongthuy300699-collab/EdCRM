import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { scheduleCapacityLabel } from "../features/trials/domain";

const read = (file: string) =>
  fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("trial schedule read model", () => {
  it("keeps permanent and trial counts separate", () => {
    expect(
      scheduleCapacityLabel({
        studentCount: 5,
        trialParticipantCount: 2,
        capacity: 8,
      }),
    ).toBe("5 постоянных + 2 пробных / 8");
    expect(
      scheduleCapacityLabel({
        studentCount: 5,
        trialParticipantCount: 0,
        capacity: 8,
      }),
    ).toBe("5 постоянных / 8");
  });

  it("returns attached counts and standalone trials without creating fake sessions", () => {
    const route = read("src/app/api/crm/schedule/route.ts");
    expect(route).toContain('from("trial_events")');
    expect(route).toContain("trialParticipantCount");
    expect(route).toContain("standaloneTrials");
    expect(route).toContain('event.mode === "standalone"');
    expect(route).toContain(
      'query = query.eq("teacher_id", access.staffProfileId)',
    );
    expect(route).not.toContain('session_kind: "trial"');
  });

  it("renders standalone trials as a separate schedule card type", () => {
    const workspace = read("src/features/scheduling/ScheduleWorkspace.tsx");
    expect(workspace).toContain("standaloneTrials");
    expect(workspace).toContain("Отдельное пробное");
    expect(workspace).toContain("scheduleCapacityLabel");
    expect(workspace).toContain("<TrialDialog");
  });
});

describe("trial lesson and teacher integration", () => {
  it("returns attached trial participants separately from attendance", () => {
    const route = read("src/app/api/crm/schedule/session/[sessionId]/route.ts");
    expect(route).toContain('from("trial_participants")');
    expect(route).toContain("trialParticipants:");
    expect(route).toContain("trialParticipantDto");
  });

  it("uses the shared lesson panel for an isolated trial participant list", () => {
    const panel = read("src/features/scheduling/LessonConductPanel.tsx");
    expect(panel).toContain("<TrialParticipantList");
    expect(panel).toContain("data.trialParticipants");
    expect(panel).toContain("readOnly={trialReadOnly}");
  });

  it("shows only the teacher read model and allows own result updates", () => {
    const teacher = read("src/app/teacher/page.tsx");
    expect(teacher).toContain("standaloneTrials");
    expect(teacher).toContain("<TrialParticipantList");
    expect(teacher).toContain("readOnly={readOnlyPreview}");
    expect(teacher).toContain("trialReadOnly={readOnlyPreview}");
  });

  it("keeps lesson lifecycle and trial lifecycle transactional", () => {
    const schedule = read("src/app/api/crm/schedule/route.ts");
    const migration = read(
      "../../supabase/migrations/20260830000001_trial_events_and_participants.sql",
    );
    expect(schedule).toContain(
      'admin.rpc("crm_cancel_lesson_session_with_trials"',
    );
    expect(schedule).toContain("group_session_capacity_exceeded");
    expect(schedule).toContain("trial_slot_conflict");
    expect(migration).toContain("trg_lesson_session_trial_conflict");
    expect(migration).toContain("trg_makeup_trial_capacity");
    expect(migration).toContain("trg_enrollment_trial_capacity");
    expect(migration).toContain("set lesson_session_id = replacement_id");
  });

  it("allows a trial result after ordinary attendance becomes read-only", () => {
    const panel = read("src/features/scheduling/LessonConductPanel.tsx");
    const adminLesson = read("src/app/(crm)/crm/lessons/[sessionId]/page.tsx");
    expect(panel).toContain("trialReadOnly = readOnly");
    expect(panel).toContain("readOnly={trialReadOnly}");
    expect(adminLesson).toContain("trialReadOnly={false}");
  });
});
