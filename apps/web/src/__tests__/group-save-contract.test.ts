import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildGroupSaveOperation } from "@/features/scheduling/group-save-contract";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("canonical group save contract", () => {
  it("preserves every operational group field and nullable date bounds", () => {
    expect(buildGroupSaveOperation({
      groupId: "fc65dfe3-934f-423f-a8f9-07319c37a0a1",
      group: {
        title: "1 группа (соревновательная)",
        courseId: "3d0d97b0-cbe6-444a-a006-2c5e533ebbbd",
        branchId: null,
        roomId: null,
        teacherId: "a2222222-e222-3333-4444-555555555555",
        status: "active",
        capacity: 8,
        startsOn: null,
        endsOn: null,
        billingEnabled: true,
        lessonPrice: 1000,
        showOnSite: true,
        sortOrder: 10,
      },
      rules: [{ weekday: 2, starts_at: "13:00", ends_at: "14:00" }],
      rebuildFuture: true,
    })).toMatchObject({
      action: "save_group",
      groupId: "fc65dfe3-934f-423f-a8f9-07319c37a0a1",
      group: { startsOn: null, endsOn: null, teacherId: "a2222222-e222-3333-4444-555555555555" },
      rebuildFuture: true,
    });
  });

  it("is used by both CRM group edit surfaces", () => {
    const groups = read("src/app/(crm)/crm/groups/page.tsx");
    const settings = read("src/app/(crm)/crm/settings/page.tsx");
    for (const source of [groups, settings]) expect(source).toContain("buildGroupSaveOperation");
  });
});
