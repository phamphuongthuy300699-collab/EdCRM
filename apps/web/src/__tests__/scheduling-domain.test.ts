import { describe, expect, it } from "vitest";
import {
  attendanceCompletionState,
  attendanceStatusLabel,
  buildScheduleNotificationText,
  concreteSessionsForStudent,
  eligibleForMakeup,
  materializeRuleOccurrences,
  type ConcreteLessonSession,
} from "@/features/scheduling/domain";

describe("scheduling domain", () => {
  it("keeps unmarked attendance distinct from presence", () => {
    expect(attendanceStatusLabel("unmarked")).toBe("Не отмечено");
    expect(attendanceStatusLabel("present")).toBe("Присутствовал");
    expect(attendanceStatusLabel("absent_excused")).toBe("Пропуск по уважительной причине");
  });

  it("explains unfinished attendance and pending absence subtype", () => {
    expect(attendanceCompletionState([
      { status: "present" },
      { status: "absent_excused" },
      { status: "unmarked", pendingAbsence: true },
      { status: "unmarked" },
      { status: "late" },
    ])).toEqual({ complete: false, remaining: 2, pendingAbsence: true, message: "Чтобы завершить занятие, отметьте ещё 2 учеников." });
    expect(attendanceCompletionState([{ status: "unmarked", pendingAbsence: true }]).pendingAbsence).toBe(true);
  });

  it("offers makeup only for an excused absence without an open assignment", () => {
    expect(eligibleForMakeup({ attendanceStatus: "absent_excused", makeupStatus: null })).toBe(true);
    expect(eligibleForMakeup({ attendanceStatus: "absent_unexcused", makeupStatus: null })).toBe(false);
    expect(eligibleForMakeup({ attendanceStatus: "absent_excused", makeupStatus: "requested" })).toBe(false);
  });

  it("orders concrete sessions and hides the moved source when its replacement exists", () => {
    const sessions: ConcreteLessonSession[] = [
      { id: "old", groupId: "g1", startsAt: "2026-08-06T14:00:00Z", status: "moved" },
      { id: "next", groupId: "g1", startsAt: "2026-08-08T14:00:00Z", status: "planned", rescheduledFromSessionId: "old" },
      { id: "later", groupId: "g1", startsAt: "2026-08-10T14:00:00Z", status: "planned" },
    ];
    expect(concreteSessionsForStudent(sessions).map((session) => session.id)).toEqual(["next", "later"]);
  });

  it("builds clear MAX messages for group and child events", () => {
    expect(buildScheduleNotificationText("lesson_scheduled", {
      childName: "Алекс",
      groupTitle: "LEGO Start",
      startsAt: "2026-08-08T14:00:00+03:00",
      reason: "Дополнительное занятие",
    })).toContain("добавлено занятие");
    expect(buildScheduleNotificationText("lesson_rescheduled", {
      childName: "Алекс",
      groupTitle: "LEGO Start",
      oldStartsAt: "2026-08-06T14:00:00+03:00",
      startsAt: "2026-08-08T14:00:00+03:00",
      reason: "Праздничный день",
    })).toContain("занятие перенесено");
    expect(buildScheduleNotificationText("makeup_scheduled", {
      childName: "Алекс",
      groupTitle: "Scratch",
      startsAt: "2026-08-09T11:00:00+03:00",
    })).toContain("отработка назначена");
  });

  it("materializes recurring rules into concrete Moscow timestamps", () => {
    const result = materializeRuleOccurrences([
      { id: "rule", weekday: 2, startsAt: "17:00:00", endsAt: "18:30:00" },
    ], "2026-08-03", "2026-08-12");
    expect(result).toEqual([
      { scheduleRuleId: "rule", lessonDate: "2026-08-04", startsAt: "2026-08-04T14:00:00.000Z", endsAt: "2026-08-04T15:30:00.000Z" },
      { scheduleRuleId: "rule", lessonDate: "2026-08-11", startsAt: "2026-08-11T14:00:00.000Z", endsAt: "2026-08-11T15:30:00.000Z" },
    ]);
  });
});
