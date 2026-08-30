import { describe, expect, it } from "vitest";
import { studentUpdateSchema } from "../features/students/contracts";
import {
  trialCreateSchema,
  trialParticipantUpdateSchema,
  trialSubjectSchema,
} from "../features/trials/contracts";
import { intervalsOverlap, trialSubjectKey } from "../features/trials/domain";

const legacyDatabaseUuid = "a2222222-e222-3333-4444-555555555555";
const otherDatabaseUuid = "b2222222-e222-3333-4444-555555555555";

describe("student edit contract", () => {
  it("normalizes only canonical editable fields", () => {
    expect(
      studentUpdateSchema.parse({
        fullName: "  Миша Петров  ",
        birthDate: "2017-09-01",
        notes: "  Нужна адаптация  ",
      }),
    ).toEqual({
      fullName: "Миша Петров",
      birthDate: "2017-09-01",
      notes: "Нужна адаптация",
    });
  });

  it("accepts nullable optional details and rejects unrelated lifecycle fields", () => {
    expect(
      studentUpdateSchema.safeParse({
        fullName: "Миша",
        birthDate: null,
        notes: null,
      }).success,
    ).toBe(true);
    expect(
      studentUpdateSchema.safeParse({ fullName: "Миша", status: "archived" })
        .success,
    ).toBe(false);
    expect(studentUpdateSchema.safeParse({ fullName: "   " }).success).toBe(
      false,
    );
    expect(
      studentUpdateSchema.safeParse({
        fullName: "Миша",
        birthDate: "01.09.2017",
      }).success,
    ).toBe(false);
  });

  it("rejects a birth date in the future", () => {
    expect(
      studentUpdateSchema.safeParse({
        fullName: "Иван Петров",
        birthDate: "2999-01-01",
        notes: null,
      }).success,
    ).toBe(false);
  });
});

describe("trial event contracts", () => {
  it("accepts legacy PostgreSQL-shaped IDs for attached mixed-subject trials", () => {
    const parsed = trialCreateSchema.safeParse({
      mode: "attached_session",
      lessonSessionId: legacyDatabaseUuid,
      participants: [
        { leadId: legacyDatabaseUuid },
        { studentId: otherDatabaseUuid },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("enforces exactly one subject and rejects malformed IDs", () => {
    expect(
      trialSubjectSchema.safeParse({ leadId: legacyDatabaseUuid }).success,
    ).toBe(true);
    expect(
      trialSubjectSchema.safeParse({ studentId: otherDatabaseUuid }).success,
    ).toBe(true);
    expect(
      trialSubjectSchema.safeParse({
        leadId: legacyDatabaseUuid,
        studentId: otherDatabaseUuid,
      }).success,
    ).toBe(false);
    expect(trialSubjectSchema.safeParse({}).success).toBe(false);
    expect(
      trialSubjectSchema.safeParse({ leadId: "not-a-database-id" }).success,
    ).toBe(false);
  });

  it("requires teacher, branch and time while allowing a standalone trial without a room", () => {
    expect(
      trialCreateSchema.safeParse({
        mode: "standalone",
        teacherId: legacyDatabaseUuid,
        branchId: otherDatabaseUuid,
        roomId: "c2222222-e222-3333-4444-555555555555",
        startsAt: "2026-09-01T10:00:00.000Z",
        endsAt: "2026-09-01T11:00:00.000Z",
        participants: [{ studentId: otherDatabaseUuid }],
      }).success,
    ).toBe(true);
    expect(
      trialCreateSchema.safeParse({
        mode: "standalone",
        teacherId: legacyDatabaseUuid,
        branchId: otherDatabaseUuid,
        startsAt: "2026-09-01T10:00:00.000Z",
        endsAt: "2026-09-01T11:00:00.000Z",
        participants: [{ studentId: otherDatabaseUuid }],
      }).success,
    ).toBe(true);
    expect(
      trialCreateSchema.safeParse({
        mode: "standalone",
        teacherId: legacyDatabaseUuid,
        startsAt: "2026-09-01T10:00:00.000Z",
        endsAt: "2026-09-01T11:00:00.000Z",
        participants: [{ studentId: otherDatabaseUuid }],
      }).success,
    ).toBe(false);
  });

  it("rejects an empty batch, duplicate subjects, and reversed time", () => {
    expect(
      trialCreateSchema.safeParse({
        mode: "attached_session",
        lessonSessionId: legacyDatabaseUuid,
        participants: [],
      }).success,
    ).toBe(false);
    expect(
      trialCreateSchema.safeParse({
        mode: "attached_session",
        lessonSessionId: legacyDatabaseUuid,
        participants: [
          { leadId: otherDatabaseUuid },
          { leadId: otherDatabaseUuid },
        ],
      }).success,
    ).toBe(false);
    expect(
      trialCreateSchema.safeParse({
        mode: "standalone",
        teacherId: legacyDatabaseUuid,
        branchId: otherDatabaseUuid,
        roomId: "c2222222-e222-3333-4444-555555555555",
        startsAt: "2026-09-01T11:00:00.000Z",
        endsAt: "2026-09-01T10:00:00.000Z",
        participants: [{ studentId: otherDatabaseUuid }],
      }).success,
    ).toBe(false);
  });

  it("keeps participant operations separate from ordinary attendance", () => {
    expect(
      trialParticipantUpdateSchema.parse({
        status: "attended",
        result: "interested",
        resultComment: "Готовы выбрать группу",
      }),
    ).toEqual({
      status: "attended",
      result: "interested",
      resultComment: "Готовы выбрать группу",
    });
    expect(
      trialParticipantUpdateSchema.safeParse({ status: "present" }).success,
    ).toBe(false);
  });

  it("uses half-open overlap semantics and stable subject keys", () => {
    expect(
      intervalsOverlap(
        "2026-09-01T10:00:00.000Z",
        "2026-09-01T11:00:00.000Z",
        "2026-09-01T10:30:00.000Z",
        "2026-09-01T11:30:00.000Z",
      ),
    ).toBe(true);
    expect(
      intervalsOverlap(
        "2026-09-01T10:00:00.000Z",
        "2026-09-01T11:00:00.000Z",
        "2026-09-01T11:00:00.000Z",
        "2026-09-01T12:00:00.000Z",
      ),
    ).toBe(false);
    expect(trialSubjectKey({ leadId: legacyDatabaseUuid })).toBe(
      `lead:${legacyDatabaseUuid}`,
    );
    expect(trialSubjectKey({ studentId: otherDatabaseUuid })).toBe(
      `student:${otherDatabaseUuid}`,
    );
  });
});
