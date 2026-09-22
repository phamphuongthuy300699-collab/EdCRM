import { describe, expect, it } from "vitest";
import { categorizeTeacherSessions } from "@/features/scheduling/teacher-portal";

describe("teacher history without manual start", () => {
  it("includes past planned and live lessons, retaining completed history", () => {
    const rows = ["planned", "live", "completed", "cancelled", "moved"].map(status => ({ id: status, status, starts_at: "2026-09-19T10:30:00Z" }));
    const result = categorizeTeacherSessions(rows, "2026-09-22");
    expect(result.history.map(s => s.id)).toEqual(["planned", "live", "completed"]);
    expect(result.upcoming).toEqual([]);
  });
  it("does not expose future lessons as historical", () => {
    expect(categorizeTeacherSessions([{ id: "future", status: "planned", starts_at: "2026-09-26T10:30:00Z" }], "2026-09-22").history).toEqual([]);
  });
});
