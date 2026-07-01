import { describe, expect, it } from "vitest";
import {
  archiveBranchPayload,
  archiveCoursePayload,
  archiveRoomPayload,
  canShowOnlinePayment,
  filterPublicCourses,
  filterPublicGroups,
  freePlaces,
  normalizeScheduleRule,
  validateStaffRole,
} from "../shared/utils/settings-directories";

describe("settings directories rules", () => {
  it("filters public courses from settings data", () => {
    const courses = filterPublicCourses([
      { id: "hidden", is_public: false, is_active: true, sort_order: 1 },
      { id: "archived", is_public: true, is_active: false, sort_order: 2 },
      { id: "visible", is_public: true, is_active: true, sort_order: 3 },
    ]);

    expect(courses.map((course: any) => course.id)).toEqual(["visible"]);
  });

  it("archives courses, branches and rooms without hard delete", () => {
    expect(archiveCoursePayload()).toEqual({ is_active: false, is_public: false });
    expect(archiveBranchPayload()).toEqual({ is_active: false, show_on_site: false });
    expect(archiveRoomPayload()).toEqual({ is_active: false });
  });

  it("filters public groups and calculates free places", () => {
    const groups = filterPublicGroups([
      { id: "closed", status: "closed", show_on_site: true },
      { id: "hidden", status: "active", show_on_site: false },
      { id: "branch-hidden", status: "active", show_on_site: true, branch: { is_active: true, show_on_site: false } },
      { id: "visible", status: "active", show_on_site: true, sort_order: 1, capacity: 8, enrollments: [{ status: "active" }, { status: "paused" }] },
    ]);

    expect(groups.map((group: any) => group.id)).toEqual(["visible"]);
    expect(freePlaces(groups[0])).toBe(7);
  });

  it("normalizes structured group schedule rules", () => {
    expect(normalizeScheduleRule({ weekday: "2", starts_at: "17:00", ends_at: "18:30" })).toEqual({
      weekday: 2,
      starts_at: "17:00:00",
      ends_at: "18:30:00",
    });
  });

  it("validates staff role and alfabank online payment status", () => {
    expect(validateStaffRole("teacher")).toBe(true);
    expect(validateStaffRole("parent")).toBe(false);
    expect(canShowOnlinePayment({ provider: "alfabank", is_enabled: true }, true)).toBe(true);
    expect(canShowOnlinePayment({ provider: "alfabank", is_enabled: true }, false)).toBe(false);
    expect(canShowOnlinePayment({ provider: "yookassa", is_enabled: true }, true)).toBe(false);
  });
});
