import fs from "fs";
import os from "os";
import path from "path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../app/api/crm/media/route";
import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";
import { getMediaUrl } from "@/shared/utils/media";

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

  it("allows the CRM to list hero media for the public first screen", async () => {
    const originalMediaDriver = process.env.MEDIA_DRIVER;
    const originalMediaLocalDir = process.env.MEDIA_LOCAL_DIR;
    const tempMediaDir = fs.mkdtempSync(path.join(os.tmpdir(), "edcrm-media-list-"));
    process.env.MEDIA_DRIVER = "local";
    process.env.MEDIA_LOCAL_DIR = tempMediaDir;

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

    try {
      const req = new NextRequest("http://localhost:3000/api/crm/media?folder=hero", {
        method: "GET",
      });

      const response = await GET(req);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(Array.isArray(json.files)).toBe(true);
    } finally {
      if (originalMediaDriver === undefined) {
        delete process.env.MEDIA_DRIVER;
      } else {
        process.env.MEDIA_DRIVER = originalMediaDriver;
      }
      if (originalMediaLocalDir === undefined) {
        delete process.env.MEDIA_LOCAL_DIR;
      } else {
        process.env.MEDIA_LOCAL_DIR = originalMediaLocalDir;
      }
      fs.rmSync(tempMediaDir, { recursive: true, force: true });
    }
  });

  it("returns local /media URLs and writes uploaded files to the local media root", async () => {
    const originalMediaDriver = process.env.MEDIA_DRIVER;
    const originalNextPublicMediaDriver = process.env.NEXT_PUBLIC_MEDIA_DRIVER;
    const originalMediaLocalDir = process.env.MEDIA_LOCAL_DIR;
    const tempMediaDir = fs.mkdtempSync(path.join(os.tmpdir(), "edcrm-media-upload-"));
    process.env.MEDIA_DRIVER = "local";
    delete process.env.NEXT_PUBLIC_MEDIA_DRIVER;
    process.env.MEDIA_LOCAL_DIR = tempMediaDir;

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

    try {
      expect(getMediaUrl("teachers/photo one.jpg")).toBe("/media/teachers/photo%20one.jpg");

      const formData = {
        get: vi.fn((key: string) => {
          if (key === "folder") return "teachers";
          if (key === "file") {
            return {
              name: "teacher photo.jpg",
              type: "image/jpeg",
              arrayBuffer: vi.fn().mockResolvedValue(Buffer.from("teacher-photo")),
            };
          }
          return null;
        }),
      };

      const req = new NextRequest("http://localhost:3000/api/crm/media", { method: "POST" });
      req.formData = vi.fn().mockResolvedValue(formData);

      const response = await POST(req);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toMatchObject({
        success: true,
        path: "teachers/teacher_photo.jpg",
        url: "/media/teachers/teacher_photo.jpg",
      });
      expect(fs.existsSync(path.join(tempMediaDir, "teachers", "teacher_photo.jpg"))).toBe(true);
    } finally {
      if (originalMediaDriver === undefined) {
        delete process.env.MEDIA_DRIVER;
      } else {
        process.env.MEDIA_DRIVER = originalMediaDriver;
      }
      if (originalNextPublicMediaDriver === undefined) {
        delete process.env.NEXT_PUBLIC_MEDIA_DRIVER;
      } else {
        process.env.NEXT_PUBLIC_MEDIA_DRIVER = originalNextPublicMediaDriver;
      }
      if (originalMediaLocalDir === undefined) {
        delete process.env.MEDIA_LOCAL_DIR;
      } else {
        process.env.MEDIA_LOCAL_DIR = originalMediaLocalDir;
      }
      fs.rmSync(tempMediaDir, { recursive: true, force: true });
    }
  });
});
