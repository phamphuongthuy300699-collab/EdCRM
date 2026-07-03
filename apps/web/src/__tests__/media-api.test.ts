import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../app/api/crm/media/route";
import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";

vi.mock("@/shared/db/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/shared/db/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/shared/utils/demo", () => ({
  isDemoMode: () => false,
}));

describe("Media API Endpoint Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 Unauthorized for POST without user session", async () => {
    // Mock user session as null
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

    const req = new NextRequest("http://localhost:3000/api/crm/media", {
      method: "POST",
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 403 Forbidden for user without owner/admin/manager role", async () => {
    // Mock authenticated user but invalid org membership role
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user-id" } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { role: "teacher" } }), // teacher role is forbidden
      }),
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

    const req = new NextRequest("http://localhost:3000/api/crm/media", {
      method: "POST",
    });

    const response = await POST(req);
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBe("Forbidden - Insufficient permissions");
  });

  it("returns 400 Bad Request if folder is not in whitelist", async () => {
    // Mock user with valid role
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-id" } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { role: "admin" } }),
      }),
    };
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

    // Create form data with invalid folder
    const formData = new FormData();
    formData.append("file", new File(["test"], "logo.png", { type: "image/png" }));
    formData.append("folder", "invalid-folder-not-in-whitelist");

    const req = new NextRequest("http://localhost:3000/api/crm/media", {
      method: "POST",
    });
    // Mock req.formData directly to avoid Undici content-type parsing issues
    req.formData = vi.fn().mockResolvedValue(formData);

    const response = await POST(req);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("is not whitelisted");
  });
});
