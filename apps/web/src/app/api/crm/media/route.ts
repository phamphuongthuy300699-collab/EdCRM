import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";
import { getMediaUrl } from "@/shared/utils/media";
import { isDemoMode } from "@/shared/utils/demo";

const LOCAL_MEDIA_DIR = "/opt/edcrm/media";
const WHITELIST_FOLDERS = [
  "branding",
  "hero",
  "teachers",
  "facilities",
  "student-projects",
  "lesson-process",
  "equipment",
  "contacts",
  "footer",
  "documents",
  "misc",
];

// Helper to authenticate and verify user role
async function checkAuthAndRole(req: NextRequest) {
  if (isDemoMode()) {
    return { ok: true, role: "admin" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, status: 401, error: "Unauthorized" };
    }

    const { data: membership } = await (supabase.from("org_memberships") as any)
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!membership || !["owner", "admin", "manager"].includes(membership.role)) {
      return { ok: false, status: 403, error: "Forbidden - Insufficient permissions" };
    }

    return { ok: true, user, role: membership.role };
  } catch (err: any) {
    console.error("Auth check error in media API:", err);
    return { ok: false, status: 500, error: "Internal authentication check error" };
  }
}

export async function GET(req: NextRequest) {
  const auth = await checkAuthAndRole(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder") || "misc";

  if (!WHITELIST_FOLDERS.includes(folder)) {
    return NextResponse.json({ error: `Folder '${folder}' is not whitelisted` }, { status: 400 });
  }

  const driver = process.env.MEDIA_DRIVER || process.env.NEXT_PUBLIC_MEDIA_DRIVER || "supabase";

  try {
    if (driver === "local") {
      const dirPath = path.join(LOCAL_MEDIA_DIR, folder);
      
      let resolvedDir = dirPath;
      if (!fs.existsSync(LOCAL_MEDIA_DIR)) {
        const fallbackRoot = path.join(process.cwd(), "public/media");
        resolvedDir = path.join(fallbackRoot, folder);
        if (!fs.existsSync(resolvedDir)) {
          fs.mkdirSync(resolvedDir, { recursive: true });
        }
      } else {
        if (!fs.existsSync(resolvedDir)) {
          fs.mkdirSync(resolvedDir, { recursive: true });
        }
      }

      const files = fs.readdirSync(resolvedDir);
      const list = files
        .filter(name => !name.startsWith("."))
        .map(name => {
          const stats = fs.statSync(path.join(resolvedDir, name));
          return {
            name,
            url: getMediaUrl(`${folder}/${name}`),
            path: `${folder}/${name}`,
            size: stats.size,
            updatedAt: stats.mtime
          };
        });

      return NextResponse.json({ files: list });
    } else {
      // Supabase storage
      const supabase = createSupabaseAdminClient();
      const bucketName = process.env.NEXT_PUBLIC_MEDIA_BUCKET || "site-assets";
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(folder);

      if (error) throw error;

      const list = (data || [])
        .filter(f => f.name !== ".emptyFolderPlaceholder")
        .map(f => ({
          name: f.name,
          url: getMediaUrl(`${folder}/${f.name}`),
          path: `${folder}/${f.name}`,
          size: f.metadata?.size || 0,
          updatedAt: f.updated_at
        }));

      return NextResponse.json({ files: list });
    }
  } catch (err: any) {
    console.error("List files error:", err);
    return NextResponse.json({ error: err.message || "Failed to list files" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await checkAuthAndRole(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const driver = process.env.MEDIA_DRIVER || process.env.NEXT_PUBLIC_MEDIA_DRIVER || "supabase";

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "misc";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!WHITELIST_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: `Folder '${folder}' is not whitelisted` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");

    if (driver === "local") {
      const dirPath = path.join(LOCAL_MEDIA_DIR, folder);
      let resolvedDir = dirPath;
      
      if (!fs.existsSync(LOCAL_MEDIA_DIR)) {
        const fallbackRoot = path.join(process.cwd(), "public/media");
        resolvedDir = path.join(fallbackRoot, folder);
        if (!fs.existsSync(resolvedDir)) {
          fs.mkdirSync(resolvedDir, { recursive: true });
        }
      } else {
        try {
          if (!fs.existsSync(resolvedDir)) {
            fs.mkdirSync(resolvedDir, { recursive: true });
          }
        } catch (dirErr) {
          const fallbackRoot = path.join(process.cwd(), "public/media");
          resolvedDir = path.join(fallbackRoot, folder);
          if (!fs.existsSync(resolvedDir)) {
            fs.mkdirSync(resolvedDir, { recursive: true });
          }
        }
      }

      fs.writeFileSync(path.join(resolvedDir, sanitizedFilename), buffer);
      
      const relativePath = `${folder}/${sanitizedFilename}`;
      return NextResponse.json({
        success: true,
        path: relativePath,
        url: getMediaUrl(relativePath)
      });
    } else {
      // Supabase Storage
      const supabase = createSupabaseAdminClient();
      const bucketName = process.env.NEXT_PUBLIC_MEDIA_BUCKET || "site-assets";
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(`${folder}/${sanitizedFilename}`, buffer, {
          contentType: file.type,
          upsert: true
        });

      if (error) throw error;

      const relativePath = `${folder}/${sanitizedFilename}`;
      return NextResponse.json({
        success: true,
        path: relativePath,
        url: getMediaUrl(relativePath)
      });
    }
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message || "Failed to upload file" }, { status: 500 });
  }
}
