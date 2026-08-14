import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { groupOperationalSessions } from "@/features/scheduling/domain";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("operational schedule", () => {
  const sessions = [
    { id: "2", startsAt: "2026-08-07T16:00:00Z", teacherId: "t2", teacherName: "Иван", groupId: "g2", groupName: "Scratch" },
    { id: "1", startsAt: "2026-08-07T12:00:00Z", teacherId: "t1", teacherName: "Дарья", groupId: "g1", groupName: "LEGO" },
    { id: "3", startsAt: "2026-08-07T14:00:00Z", teacherId: "t1", teacherName: "Дарья", groupId: "g2", groupName: "Scratch" },
  ];

  it("sorts all lessons chronologically", () => expect(groupOperationalSessions(sessions, "all")[0].sessions.map((item) => item.id)).toEqual(["1", "3", "2"]));
  it("groups lessons by teacher", () => expect(groupOperationalSessions(sessions, "teacher").map((item) => item.label)).toEqual(["Дарья", "Иван"]));
  it("groups lessons by group", () => expect(groupOperationalSessions(sessions, "group").map((item) => item.label)).toEqual(["LEGO", "Scratch"]));

  it("defaults UI to today and all lessons and exposes composable filters", () => {
    const source = read("src/features/scheduling/ScheduleWorkspace.tsx");
    expect(source).toContain('useState<Period>("today")');
    expect(source).toContain('useState<ScheduleView>("all")');
    for (const filter of ["teacherId", "selectedGroupId", "branchId", "roomId", "status", "sessionKind"]) expect(source).toContain(filter);
  });

  it("applies organization-scoped API filters", () => {
    const route = read("src/app/api/crm/schedule/route.ts");
    for (const field of ["teacherId", "branchId", "roomId", "status", "sessionKind"]) expect(route).toContain(field);
    expect(route).toContain('.eq("teacher_id", access.staffProfileId)');
  });

  it("blocks rule conflicts independently from future rebuilding", () => {
    const migration = read("../../supabase/migrations/20260807000002_group_schedule_conflicts.sql");
    expect(migration).toContain("before insert or update");
    expect(migration).toContain("other_rule.weekday = new.weekday");
    expect(migration).toContain("other_group.teacher_id = target_group.teacher_id");
    expect(migration).toContain("other_group.room_id = target_group.room_id");
    expect(migration).not.toContain("p_rebuild_future");
  });

  it("saves group attributes and schedule rules in one database transaction", () => {
    const migration = read("../../supabase/migrations/20260807000004_atomic_group_schedule_save.sql");
    const route = read("src/app/api/crm/schedule/route.ts");
    const schemas = read("src/features/scheduling/schemas.ts");
    const groupsPage = read("src/app/(crm)/crm/groups/page.tsx");
    const settingsPage = read("src/app/(crm)/crm/settings/page.tsx");
    expect(migration).toContain("save_group_with_schedule");
    expect(migration).toContain("for update");
    expect(migration).toContain("replace_group_schedule");
    expect(schemas).toContain('action: z.literal("save_group")');
    expect(route).toContain('admin.rpc("save_group_with_schedule"');
    expect(groupsPage).toContain("buildGroupSaveOperation");
    expect(settingsPage).toContain("buildGroupSaveOperation");
  });
});
