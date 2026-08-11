import { describe, expect, it } from "vitest";
import { identityOrganizationsAreExclusive, isStaffIdentityOwnedByOrganization, staffIdentityMetadata } from "@/app/api/crm/staff/_shared";

describe("staff Auth identity ownership", () => {
  it("marks newly created identities with a server-owned organization", () => {
    expect(staffIdentityMetadata("org-a")).toEqual({ edcrm_staff_organization_id: "org-a" });
  });

  it("fails closed for missing or foreign organization metadata", () => {
    expect(isStaffIdentityOwnedByOrganization({ app_metadata: {} }, "org-a")).toBe(false);
    expect(isStaffIdentityOwnedByOrganization({ app_metadata: { edcrm_staff_organization_id: "org-b" } }, "org-a")).toBe(false);
    expect(isStaffIdentityOwnedByOrganization({ app_metadata: { edcrm_staff_organization_id: "org-a" } }, "org-a")).toBe(true);
  });

  it("includes staff, guardian and student organizations in the live ownership decision", () => {
    expect(identityOrganizationsAreExclusive([[{ organization_id: "org-a" }], [], []], "org-a")).toBe(true);
    expect(identityOrganizationsAreExclusive([[{ organization_id: "org-a" }], [{ organization_id: "org-b" }], []], "org-a")).toBe(false);
    expect(identityOrganizationsAreExclusive([[{ organization_id: "org-a" }], [], [{ organization_id: "org-b" }]], "org-a")).toBe(false);
    expect(identityOrganizationsAreExclusive([[], [], []], "org-a")).toBe(false);
  });
});
