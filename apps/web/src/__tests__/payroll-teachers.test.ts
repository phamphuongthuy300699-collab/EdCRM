import { describe, expect, it, vi } from "vitest";
import { loadPayrollTeacherNames } from "@/lib/finance/payroll-teachers";

describe("loadPayrollTeacherNames", () => {
  it("loads unique teacher names through tenant-scoped memberships", async () => {
    const inQuery = vi.fn().mockResolvedValue({
      data: [{ user_id: "teacher-1", profiles: { full_name: "Тестовый преподаватель" } }],
      error: null,
    });
    const organizationQuery = { in: inQuery };
    const eq = vi.fn().mockReturnValue(organizationQuery);
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const names = await loadPayrollTeacherNames(
      { from },
      "organization-1",
      ["teacher-1", "teacher-1", null],
    );

    expect(from).toHaveBeenCalledWith("org_memberships");
    expect(eq).toHaveBeenCalledWith("organization_id", "organization-1");
    expect(inQuery).toHaveBeenCalledWith("user_id", ["teacher-1"]);
    expect(names.get("teacher-1")).toBe("Тестовый преподаватель");
  });

  it("does not query when a payroll page has no teachers", async () => {
    const from = vi.fn();
    await expect(loadPayrollTeacherNames({ from }, "organization-1", [])).resolves.toEqual(new Map());
    expect(from).not.toHaveBeenCalled();
  });
});
