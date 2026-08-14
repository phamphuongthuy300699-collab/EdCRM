type PortalRole = "owner" | "admin" | "manager" | "teacher" | string | null;

type PortalAccessInput = {
  pathname: string;
  role: PortalRole;
  isGuardian: boolean;
  isStudent: boolean;
  hasTeacherPreview: boolean;
};

export type PortalAccessDecision =
  | { allow: true }
  | { allow: false; redirectTo: string };

export function resolveProtectedPortalAccess(input: PortalAccessInput): PortalAccessDecision {
  if (input.pathname !== "/teacher" && !input.pathname.startsWith("/teacher/")) return { allow: true };

  if (input.role === "teacher") {
    return input.hasTeacherPreview
      ? { allow: false, redirectTo: "/teacher" }
      : { allow: true };
  }
  if ((input.role === "owner" || input.role === "admin") && input.hasTeacherPreview) {
    return { allow: true };
  }
  if (input.role === "owner" || input.role === "admin" || input.role === "manager") {
    return { allow: false, redirectTo: "/crm" };
  }
  if (input.isStudent) return { allow: false, redirectTo: "/student" };
  if (input.isGuardian) return { allow: false, redirectTo: "/parent" };
  return { allow: false, redirectTo: "/login?error=role_check_failed" };
}
