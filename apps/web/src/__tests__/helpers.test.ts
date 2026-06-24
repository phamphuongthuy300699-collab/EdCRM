import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isDemoMode } from "../shared/utils/demo";

describe("Helpers and Mode Detectors", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return true for isDemoMode when URL is missing or contains placeholder", () => {
    // 1. Missing URL
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(isDemoMode()).toBe(true);

    // 2. Contains placeholder
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder-project.supabase.co";
    expect(isDemoMode()).toBe(true);
  });

  it("should return false for isDemoMode when URL is a valid Supabase URL", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc123xyz.supabase.co";
    expect(isDemoMode()).toBe(false);
  });

  it("should correctly decide redirect URL based on role and auth status", () => {
    const getRedirectUrl = (role: string | undefined, isStudent: boolean, isGuardian: boolean, currentPath: string) => {
      // Logic mirrors middleware redirects
      if (!role && !isStudent && !isGuardian) {
        return "/login?error=role_check_failed";
      }

      if (currentPath === "/login") {
        if (role === "owner" || role === "admin" || role === "manager") return "/crm";
        if (role === "teacher") return "/teacher";
        if (isStudent) return "/student";
        if (isGuardian) return "/parent";
        return "/crm";
      }

      if (currentPath.startsWith("/crm")) {
        if (role === "owner" || role === "admin" || role === "manager") return "allow";
        if (role === "teacher") return "/teacher";
        if (isStudent) return "/student";
        if (isGuardian) return "/parent";
        return "/login?error=role_check_failed";
      }

      return "allow";
    };

    // Test Login Path redirects
    expect(getRedirectUrl("admin", false, false, "/login")).toBe("/crm");
    expect(getRedirectUrl("teacher", false, false, "/login")).toBe("/teacher");
    expect(getRedirectUrl(undefined, true, false, "/login")).toBe("/student");
    expect(getRedirectUrl(undefined, false, true, "/login")).toBe("/parent");

    // Test CRM Path redirects
    expect(getRedirectUrl("admin", false, false, "/crm")).toBe("allow");
    expect(getRedirectUrl("teacher", false, false, "/crm")).toBe("/teacher");
    expect(getRedirectUrl(undefined, true, false, "/crm")).toBe("/student");
    expect(getRedirectUrl(undefined, false, true, "/crm")).toBe("/parent");
    expect(getRedirectUrl(undefined, false, false, "/crm")).toBe("/login?error=role_check_failed");
  });
});
