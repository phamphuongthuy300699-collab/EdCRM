import { describe, expect, it } from "vitest";
import {
  buildArchivePayload,
  buildRestorePayload,
  evaluateDeleteSafety,
  roleCanPerformLifecycleAction,
} from "../shared/utils/entity-lifecycle";

describe("CRM entity lifecycle rules", () => {
  it("archives and restores groups without changing business status", () => {
    expect(buildArchivePayload("groups", "actor-1")).toMatchObject({
      archived_by: "actor-1",
      show_on_site: false,
    });
    expect(buildArchivePayload("groups", "actor-1")).toHaveProperty("archived_at");

    expect(buildRestorePayload("groups")).toEqual({
      archived_at: null,
      archived_by: null,
      show_on_site: true,
    });
  });

  it("allows hard delete for a draft group without dependencies", () => {
    const result = evaluateDeleteSafety("groups", { status: "draft", title: "Draft" }, {
      activeEnrollments: 0,
      lessonSessions: 0,
      attendance: 0,
      invoices: 0,
      homeworkAssignments: 0,
    });

    expect(result.allowed).toBe(true);
  });

  it("blocks hard delete for a group with educational or financial history", () => {
    const result = evaluateDeleteSafety("groups", { status: "active", title: "LEGO Start" }, {
      activeEnrollments: 1,
      lessonSessions: 2,
      attendance: 0,
      invoices: 1,
      homeworkAssignments: 0,
    });

    expect(result.allowed).toBe(false);
    expect(result.message).toContain("Группа используется");
    expect(result.fallbackAction).toBe("archive");
  });

  it("limits hard delete and personal data cleanup to owner/admin", () => {
    expect(roleCanPerformLifecycleAction("manager", "archive")).toBe(true);
    expect(roleCanPerformLifecycleAction("manager", "delete")).toBe(false);
    expect(roleCanPerformLifecycleAction("admin", "delete")).toBe(true);
    expect(roleCanPerformLifecycleAction("owner", "anonymize")).toBe(true);
  });
});
