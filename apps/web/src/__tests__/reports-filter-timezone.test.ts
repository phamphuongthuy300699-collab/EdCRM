import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { localDate, periodRange, timestampBounds } from "@/lib/reports/date-range";

const root = path.resolve(__dirname, "..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

describe("report organization calendar", () => {
  it("keeps August 1 in Moscow when UTC is still July 31", () => {
    expect(localDate(new Date("2026-07-31T21:30:00.000Z"), "Europe/Moscow")).toBe("2026-08-01");
  });

  it("calculates previous month boundaries in the organization calendar", () => {
    expect(periodRange("previous-month", new Date("2026-08-01T00:30:00+03:00"), "Europe/Moscow")).toEqual({
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
    });
  });

  it("converts local day bounds to UTC timestamps", () => {
    expect(timestampBounds("2026-08-01", "2026-08-01", "Europe/Moscow")).toEqual({
      from: "2026-07-31T21:00:00.000Z",
      to: "2026-08-01T20:59:59.999Z",
    });
  });
});

describe("report scope contracts", () => {
  const screen = read("app/api/crm/reports/route.ts");
  const csv = read("app/api/crm/reports/export/route.ts");
  const scope = read("lib/reports/report-scope.ts");

  it("uses filtered group/session scope for students, attendance, debits and payroll", () => {
    expect(screen).toContain("buildReportScope");
    expect(screen).toContain(".in(\"lesson_session_id\", sessionIds)");
    expect(screen).toContain("studentsQuery.in(\"id\", scopedStudentIds)");
    expect(screen).toContain(".in(\"lesson_session_id\", sessionIds)");
  });

  it("passes branch, course, group and teacher filters to attendance and payroll CSV", () => {
    for (const filter of ["branchId", "courseId", "groupId", "teacherId"]) {
      expect(screen + scope).toContain(filter);
      expect(csv + scope).toContain(filter);
    }
    expect(csv).toContain("buildReportScope");
  });

  it("labels cash, debt and ungrouped counts as organization-wide when scoped", () => {
    expect(screen).toContain("organizationWide");
    expect(read("app/(crm)/crm/reports/page.tsx")).toContain("по всей организации");
  });
});
