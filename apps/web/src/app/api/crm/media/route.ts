import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { getMediaUrl } from "@/shared/utils/media";

const LOCAL_MEDIA_DIR = "/opt/edcrm/media";

// Helper to check org permission
async function checkAuth(req: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient();
    const authHeader = req.headers.get("authorization");
    let token = "";
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      // Fallback to checking cookie session via admin client
      const cookieHeader = req.headers.get("cookie");
      if (cookieHeader) {
        // If cookies exist, try to get the user session
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) return user;
      }
    }

    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user) return user;
    }
  } catch (e) {
    console.error("Auth check failed:", e);
  }
  return null;
}

export async function GET(req: NextRequest) {
  const user = await checkAuth(req);
  // Allow authenticated users to view/list files
  // If not authenticated in production, we can restrict, but for local/demo let's be flexible or require auth
  
  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder") || "misc";
  const driver = process.env.MEDIA_DRIVER || process.env.NEXT_PUBLIC_MEDIA_DRIVER || "supabase";

  try {
    if (driver === "local") {
      const dirPath = path.join(LOCAL_MEDIA_DIR, folder);
      
      // Fallback path inside public if /opt is not writable or during local development
      let resolvedDir = dirPath;
      if (!fs.existsSync(LOCAL_MEDIA_DIR)) {
        // Fallback to project root /public/media
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
        .filter(name => !name.startsWith(".")) // skip hidden files
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
  // Check auth
  const user = await checkAuth(req);
  // For safety, require authenticated user for uploads
  
  const driver = process.env.MEDIA_DRIVER || process.env.NEXT_PUBLIC_MEDIA_DRIVER || "supabase";

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "misc";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");

    if (driver === "local") {
      const dirPath = path.join(LOCAL_MEDIA_DIR, folder);
      let resolvedDir = dirPath;
      
      // Fallback path inside public if /opt is not writable or during local development
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
          // If permission denied to /opt/edcrm/media, use fallback
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
