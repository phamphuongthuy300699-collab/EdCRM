import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  matchesStudentSearch,
  studentOperationalState,
  summarizeStudents,
} from "@/features/students/domain";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("student operational state", () => {
  const rows = [
    { id: "active-grouped", status: "active", enrollments: [{ status: "active", groupId: "g1" }] },
    { id: "active-free", status: "active", enrollments: [] },
    { id: "paused", status: "paused", enrollments: [{ status: "active", groupId: "g2" }] },
    { id: "legacy", status: null, enrollments: [] },
    { id: "archived", status: "archived", enrollments: [] },
  ];

  it("keeps an active student active even without a group", () => {
    expect(studentOperationalState(rows[1])).toMatchObject({ status: "active", withoutGroup: true });
  });

  it("counts status separately from active enrollment", () => {
    expect(summarizeStudents(rows)).toEqual({ total: 5, active: 3, withoutGroup: 2, paused: 1, archived: 1, activeEnrollments: 2 });
  });

  it("normalizes a legacy null status safely to active", () => {
    expect(studentOperationalState(rows[3])).toMatchObject({ status: "active", withoutGroup: true, wasLegacyStatus: true });
  });
});

describe("student search", () => {
  const student = {
    fullName: "Иван Петров",
    guardians: [{ fullName: "Анна Петрова", phone: "+7 (900) 123-45-67" }],
  };

  it("matches child name", () => expect(matchesStudentSearch(student, "иван")).toBe(true));
  it("matches guardian name", () => expect(matchesStudentSearch(student, "анна")).toBe(true));
  it("matches guardian phone regardless of formatting", () => expect(matchesStudentSearch(student, "9001234567")).toBe(true));
});

describe("shared CRM operation contracts", () => {
  it("has one debounced organization-scoped student picker", () => {
    const picker = read("src/shared/ui/StudentPicker.tsx");
    const api = read("src/app/api/crm/students/search/route.ts");
    expect(picker).toContain("StudentPicker");
    expect(picker).toContain("setTimeout");
    expect(picker).toContain("excludeStudentIds");
    expect(api).toContain("access.organizationId");
    expect(api).toContain("student_guardians");
    expect(api).toContain("enrollments");
    expect(api).toContain("matchingGuardianIds");
    expect(api).toContain("candidateStudentIds");
    expect(api).not.toContain(".limit(100)");
  });

  it("keeps assignment and transfer on one transactional enrollment RPC", () => {
    const migration = read("../../supabase/migrations/20260807000001_student_operations.sql");
    const route = read("src/app/api/crm/students/enrollment/route.ts");
    expect(migration).toContain("crm_set_student_enrollment");
    expect(migration).toContain("for update");
    expect(migration).toContain("status = 'cancelled'");
    expect(route).toContain('admin.rpc("crm_set_student_enrollment"');
  });

  it("computes dashboard totals independently of limited recent cards", () => {
    const route = read("src/app/api/crm/dashboard/route.ts");
    expect(route).toContain('count: "exact"');
    expect(route).toContain("withoutGroup");
    expect(route).toContain("overdueAmountResult");
    expect(route).toContain("recentLeadsResult");
  });
});
