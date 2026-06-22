import { describe, it, expect } from "vitest";

describe("Student portal lesson materials access rules", () => {
  const checkAccess = (session: { status: string; materials_unlocked: boolean } | null) => {
    if (!session) return false;
    return session.materials_unlocked && (session.status === "live" || session.status === "completed");
  };

  it("should deny access when session is planned or materials are locked", () => {
    // Planned session with locked materials
    expect(checkAccess({ status: "planned", materials_unlocked: false })).toBe(false);

    // Planned session with unlocked materials (safety check: lesson hasn't started)
    expect(checkAccess({ status: "planned", materials_unlocked: true })).toBe(false);

    // No session today
    expect(checkAccess(null)).toBe(false);
  });

  it("should allow access when session status is live and materials are unlocked", () => {
    // Live session with unlocked materials
    expect(checkAccess({ status: "live", materials_unlocked: true })).toBe(true);
  });

  it("should allow access when session is completed and materials are unlocked", () => {
    // Completed session with unlocked materials
    expect(checkAccess({ status: "completed", materials_unlocked: true })).toBe(true);
  });
});
