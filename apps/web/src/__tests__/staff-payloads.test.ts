import { describe, expect, it } from "vitest";
import { buildStaffPayload, buildTeacherRatePayload } from "@/features/staff/payloads";

const draft = {
  organizationId: "90000000-0000-4000-8000-000000000010",
  userId: "90000000-0000-4000-8000-000000000002",
  email: "teacher@example.test",
  fullName: "Тестовый Преподаватель",
  phone: "+70000000000",
  role: "teacher",
  specialty: "Робототехника",
  publicBio: "Описание",
  internalComment: "Комментарий",
  avatarUrl: "teachers/test.webp",
  showOnSite: true,
  sortOrder: "12",
  payMode: "per_lesson",
  payRate: "1500.50",
  payRateEffectiveFrom: "2026-08-13",
  unrelated: "must not cross the API boundary",
};

describe("staff editor payloads", () => {
  it("sends only fields accepted by the strict staff endpoint", () => {
    expect(buildStaffPayload(draft)).toEqual({
      organizationId: draft.organizationId,
      userId: draft.userId,
      email: draft.email,
      fullName: draft.fullName,
      phone: draft.phone,
      role: draft.role,
      specialty: draft.specialty,
      publicBio: draft.publicBio,
      internalComment: draft.internalComment,
      avatarUrl: draft.avatarUrl,
      showOnSite: true,
      sortOrder: 12,
    });
  });

  it("builds a separate mode-aware teacher rate payload", () => {
    expect(buildTeacherRatePayload(draft, draft.userId)).toEqual({
      teacherId: draft.userId,
      mode: "per_lesson",
      rate: 1500.5,
      effectiveFrom: "2026-08-13",
    });
  });

  it("does not create finance payloads for non-teachers or blank rates", () => {
    expect(buildTeacherRatePayload({ ...draft, role: "manager" }, draft.userId)).toBeNull();
    expect(buildTeacherRatePayload({ ...draft, payRate: "" }, draft.userId)).toBeNull();
    expect(buildTeacherRatePayload(draft, "")).toBeNull();
  });
});
