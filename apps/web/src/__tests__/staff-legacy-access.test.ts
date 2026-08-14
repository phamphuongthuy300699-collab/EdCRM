import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { provisionStaffAccessSchema } from "@/app/api/crm/staff/_shared";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");
const legacyProfileId = "a2222222-e222-3333-4444-555555555555";

describe("legacy staff portal provisioning", () => {
  it("accepts a canonical legacy profile UUID and an independent login email", () => {
    expect(provisionStaffAccessSchema.safeParse({
      staffProfileId: legacyProfileId,
      loginEmail: "alena.portal@example.invalid",
    }).success).toBe(true);
    expect(provisionStaffAccessSchema.safeParse({
      staffProfileId: "not-a-uuid",
      loginEmail: "bad",
    }).success).toBe(false);
  });

  it("creates only an Auth identity and mapping for an existing canonical profile", () => {
    const route = read("src/app/api/crm/staff/provision-access/route.ts");
    expect(route).toContain("admin.auth.admin.createUser");
    expect(route).toContain('.from("staff_auth_identities")');
    expect(route).toContain(".insert({");
    expect(route).toContain("staff_profile_id: input.staffProfileId");
    expect(route).toContain("auth_user_id: authUserId");
    expect(route).toContain("admin.auth.admin.deleteUser(authUserId)");
    expect(route).not.toContain('.from("profiles").insert');
    expect(route).not.toContain('.from("org_memberships").insert');
    expect(route).toContain("STAFF_IDENTITY_ALREADY_EXISTS");
  });

  it("maps modern staff and resolves reset/list through the mapping", () => {
    const create = read("src/app/api/crm/staff/create/route.ts");
    const reset = read("src/app/api/crm/staff/reset-password/route.ts");
    const list = read("src/app/api/crm/staff/list/route.ts");
    expect(create).toContain('.from("staff_auth_identities")');
    expect(create).toContain("staff_profile_id: userId");
    expect(reset).toContain('.from("staff_auth_identities")');
    expect(reset).toContain("updateUserById(targetAuthUserId");
    expect(list).toContain('.from("staff_auth_identities")');
    expect(list).not.toContain("admin.auth.admin.listUsers");
  });

  it("edits and reactivates the canonical profile without requiring a matching Auth UUID", () => {
    const update = read("src/app/api/crm/staff/update/route.ts");
    expect(update).toContain('.from("staff_auth_identities")');
    expect(update).toContain("updateUserById(targetAuthUserId");
    expect(update).not.toContain("getUserById(input.userId)");
    expect(update).not.toContain('.eq("is_active", true).maybeSingle()');
    expect(update).toContain("is_active: true");
  });

  it("shows employee state and portal state separately and provisions from the UI", () => {
    const page = read("src/app/(crm)/crm/settings/page.tsx");
    expect(page).toContain("Сотрудник активен");
    expect(page).toContain("ЛК активен");
    expect(page).toContain("Нет доступа в ЛК");
    expect(page).toContain("/api/crm/staff/provision-access");
    expect(page).toContain("Email / логин для ЛК");
    expect(page).not.toContain("explainLegacyStaffAccess");
  });
});
