import { describe, expect, it } from "vitest";
import { resolveStaffContextFromRows } from "@/features/staff/auth-context";
import { resolveStaffProfileId } from "@/features/staff/browser-auth";
import fs from "node:fs";
import path from "node:path";

const authUserId = "94000000-0000-4000-8000-000000000002";
const legacyProfileId = "a2222222-e222-3333-4444-555555555555";
const organizationId = "a3848a60-a292-491a-85eb-7f2824cf4e77";
const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("staff auth context", () => {
  it("resolves mapped browser sessions and keeps direct identities as fallback", async () => {
    const mappedClient = { rpc: async () => ({ data: legacyProfileId, error: null }) };
    const directClient = { rpc: async () => ({ data: null, error: { message: "not mapped" } }) };
    await expect(resolveStaffProfileId(mappedClient, authUserId)).resolves.toBe(legacyProfileId);
    await expect(resolveStaffProfileId(directClient, authUserId)).resolves.toBe(authUserId);
  });

  it("resolves a mapped Auth identity to its canonical staff profile", () => {
    expect(resolveStaffContextFromRows({
      authUserId,
      identity: { organization_id: organizationId, staff_profile_id: legacyProfileId },
      memberships: [{ organization_id: organizationId, user_id: legacyProfileId, role: "teacher", is_active: true }],
    })).toEqual({ authUserId, staffProfileId: legacyProfileId, organizationId, role: "teacher" });
  });

  it("keeps modern direct identities backward compatible", () => {
    expect(resolveStaffContextFromRows({
      authUserId,
      identity: null,
      memberships: [{ organization_id: organizationId, user_id: authUserId, role: "admin", is_active: true }],
    })).toEqual({ authUserId, staffProfileId: authUserId, organizationId, role: "admin" });
  });

  it("does not grant application access through an inactive membership", () => {
    expect(resolveStaffContextFromRows({
      authUserId,
      identity: { organization_id: organizationId, staff_profile_id: legacyProfileId },
      memberships: [{ organization_id: organizationId, user_id: legacyProfileId, role: "teacher", is_active: false }],
    })).toBeNull();
  });

  it("does not fall back to a direct identity when a mapping exists but is inconsistent", () => {
    expect(resolveStaffContextFromRows({
      authUserId,
      identity: { organization_id: organizationId, staff_profile_id: legacyProfileId },
      memberships: [{ organization_id: "94000000-0000-4000-8000-000000000020", user_id: legacyProfileId, role: "teacher", is_active: true }],
    })).toBeNull();
  });

  it("uses canonical staff profiles for teacher business foreign keys", () => {
    const schedule = read("src/app/api/crm/schedule/route.ts");
    const session = read("src/app/api/crm/schedule/session/[sessionId]/route.ts");
    const payroll = read("src/app/api/teacher/payroll/route.ts");
    expect(schedule).toContain('.eq("teacher_id", access.staffProfileId)');
    expect(schedule).toContain("p_actor_id: access.staffProfileId");
    expect(session).toContain("session.teacher_id !== access.staffProfileId");
    expect(payroll).toContain("const teacherProfileId = previewTeacherId || access.staffProfileId");
    expect(payroll).toContain('.eq("teacher_id", teacherProfileId)');
  });

  it("keeps Auth-only operations tied to authUserId and audit actors canonical", () => {
    const reset = read("src/app/api/crm/staff/reset-password/route.ts");
    const interactions = read("src/app/api/crm/interactions/route.ts");
    expect(reset).toContain("staff-password-reset:${access.authUserId}");
    expect(interactions).toContain("p_actor_id: access.staffProfileId");
  });

  it("uses the mapped profile for login, middleware and lifecycle authorization", () => {
    const login = read("src/app/login/page.tsx");
    const middleware = read("src/middleware.ts");
    const lifecycle = read("src/app/api/crm/entities/[entity]/[action]/route.ts");
    expect(login).toContain("resolveStaffProfileId");
    expect(middleware).toContain("resolveStaffProfileId");
    expect(lifecycle).toContain("loadStaffAuthContext");
    expect(lifecycle).toContain("actorId: auth.staffProfileId");
    expect(lifecycle).not.toContain("actorId: auth.userId");
  });
});
