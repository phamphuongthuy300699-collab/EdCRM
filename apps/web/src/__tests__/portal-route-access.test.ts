import { describe, expect, it } from "vitest";
import { resolveProtectedPortalAccess } from "@/features/auth/portal-route-access";

const teacherPath = (role: string | null, previewTeacherId?: string) => resolveProtectedPortalAccess({
  pathname: "/teacher",
  role,
  isGuardian: false,
  isStudent: false,
  hasTeacherPreview: Boolean(previewTeacherId),
});

describe("teacher portal middleware routing contract", () => {
  it("does not treat the public teachers directory as the teacher cabinet", () => {
    expect(resolveProtectedPortalAccess({ pathname: "/teachers", role: null, isGuardian: false, isStudent: false, hasTeacherPreview: false }))
      .toEqual({ allow: true });
  });

  it.each(["owner", "admin"])("allows %s preview routing", (role) => {
    expect(teacherPath(role, "a2222222-e222-3333-4444-555555555555")).toEqual({ allow: true });
  });

  it("redirects owner without preview to CRM", () => {
    expect(teacherPath("owner")).toEqual({ allow: false, redirectTo: "/crm" });
  });

  it("allows a teacher only their normal cabinet route", () => {
    expect(teacherPath("teacher")).toEqual({ allow: true });
    expect(teacherPath("teacher", "a2222222-e222-3333-4444-555555555555")).toEqual({
      allow: false,
      redirectTo: "/teacher",
    });
  });

  it("does not grant managers preview access", () => {
    expect(teacherPath("manager", "a2222222-e222-3333-4444-555555555555")).toEqual({
      allow: false,
      redirectTo: "/crm",
    });
  });

  it("keeps guardian and student portal separation", () => {
    expect(resolveProtectedPortalAccess({ pathname: "/teacher", role: null, isGuardian: true, isStudent: false, hasTeacherPreview: true }))
      .toEqual({ allow: false, redirectTo: "/parent" });
    expect(resolveProtectedPortalAccess({ pathname: "/teacher", role: null, isGuardian: false, isStudent: true, hasTeacherPreview: true }))
      .toEqual({ allow: false, redirectTo: "/student" });
  });
});
