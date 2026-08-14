import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";
import { getMediaUrl } from "@/shared/utils/media";
import { isDemoAuthBypassAllowed } from "@/shared/utils/demo-auth";
import { resolveMediaUsages } from "./media-usages";
import { inspectMediaUpload, mediaStorageNameBelongsToOrganization, namespaceMediaStorageName } from "@/lib/security/media-upload";
import { checkRateLimit, rateLimitResponse, requestFingerprint } from "@/lib/security/rate-limit";
import { loadStaffAuthContext } from "@/features/staff/auth-context";

const DEFAULT_LOCAL_MEDIA_DIR = "/opt/edcrm/media";
const WHITELIST_FOLDERS = [
  "branding",
  "hero",
  "course-cards",
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

function getLocalMediaDir() {
  return process.env.MEDIA_LOCAL_DIR || DEFAULT_LOCAL_MEDIA_DIR;
}

// Helper to authenticate and verify user role
async function checkAuthAndRole(req: NextRequest) {
  if (isDemoAuthBypassAllowed()) {
    return { ok: true, user: { id: "demo-user" }, organizationId: "demo-org", role: "admin" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, status: 401, error: "Unauthorized" };
    }

    const context = await loadStaffAuthContext(createSupabaseAdminClient(), user.id);

    if (!context || !["owner", "admin", "manager"].includes(context.role)) {
      return { ok: false, status: 403, error: "Forbidden - Insufficient permissions" };
    }

    return { ok: true, user, role: context.role, organizationId: context.organizationId };
  } catch (err: any) {
    console.error("Auth check error in media API:", err);
    return { ok: false, status: 500, error: "Internal authentication check error" };
  }
}

function normalizeRequestedMediaPath(value: string) {
  const normalized = value.replace(/^\/+/, "");
  if (normalized.includes("..")) return "";
  const [folder] = normalized.split("/");
  if (!WHITELIST_FOLDERS.includes(folder)) return "";
  return normalized;
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
  const organizationId = (auth as any).organizationId as string;

  try {
    if (driver === "local") {
      const resolvedDir = path.join(getLocalMediaDir(), folder);
      if (!fs.existsSync(resolvedDir)) {
        fs.mkdirSync(resolvedDir, { recursive: true });
      }

      const files = fs.readdirSync(resolvedDir).filter((name) => mediaStorageNameBelongsToOrganization(name, organizationId));
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

      const usages = (auth as any).organizationId
        ? await resolveMediaUsages(createSupabaseAdminClient(), (auth as any).organizationId, list.map((file) => file.path))
        : {};
      return NextResponse.json({ files: list.map((file) => ({ ...file, usages: usages[file.path] || [] })) });
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
        .filter(f => mediaStorageNameBelongsToOrganization(f.name, organizationId))
        .map(f => ({
          name: f.name,
          url: getMediaUrl(`${folder}/${f.name}`),
          path: `${folder}/${f.name}`,
          size: f.metadata?.size || 0,
          updatedAt: f.updated_at
        }));

      const usages = (auth as any).organizationId
        ? await resolveMediaUsages(supabase, (auth as any).organizationId, list.map((file) => file.path))
        : {};
      return NextResponse.json({ files: list.map((file) => ({ ...file, usages: usages[file.path] || [] })) });
    }
  } catch (err: any) {
    console.error("List files error:", err);
    return NextResponse.json({ error: "Failed to list files" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await checkAuthAndRole(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const rate = checkRateLimit({ key: `media-upload:${(auth as any).user?.id || requestFingerprint(req)}`, limit: 30, windowMs: 10 * 60_000 });
  if (!rate.allowed) return rateLimitResponse(rate);

  const driver = process.env.MEDIA_DRIVER || process.env.NEXT_PUBLIC_MEDIA_DRIVER || "supabase";
  const organizationId = (auth as any).organizationId as string;

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

    const maxBytes = Number(process.env.MAX_MEDIA_UPLOAD_BYTES || 8 * 1024 * 1024);
    if (file.size > maxBytes) {
      console.warn("[security]", { scope: "security", event: "media_upload_rejected", code: "MEDIA_TOO_LARGE" });
      return NextResponse.json({ error: "Файл слишком большой", code: "MEDIA_TOO_LARGE" }, { status: 413 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const inspection = inspectMediaUpload({ folder, originalName: file.name, declaredType: file.type, size: file.size, bytes: buffer, maxBytes });
    if (!inspection.ok) {
      console.warn("[security]", { scope: "security", event: "media_upload_rejected", code: inspection.code });
      return NextResponse.json({ error: "Недопустимый файл", code: inspection.code }, { status: inspection.status });
    }
    const storageName = namespaceMediaStorageName(organizationId, inspection.storageName);

    if (driver === "local") {
      const resolvedDir = path.join(getLocalMediaDir(), folder);
      if (!fs.existsSync(resolvedDir)) {
        fs.mkdirSync(resolvedDir, { recursive: true });
      }

      fs.writeFileSync(path.join(resolvedDir, storageName), buffer, { flag: "wx" });
      
      const relativePath = `${folder}/${storageName}`;
      if ((auth as any).organizationId) await createSupabaseAdminClient().from("crm_audit_log").insert({ organization_id: (auth as any).organizationId, actor_id: (auth as any).user?.id || null, action: "upload_media", entity_table: "media_files", entity_title: relativePath, metadata: { path: relativePath, contentType: inspection.contentType, size: file.size } });
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
        .upload(`${folder}/${storageName}`, buffer, {
          contentType: inspection.contentType,
          upsert: false
        });

      if (error) throw error;

      const relativePath = `${folder}/${storageName}`;
      if ((auth as any).organizationId) await supabase.from("crm_audit_log").insert({ organization_id: (auth as any).organizationId, actor_id: (auth as any).user?.id || null, action: "upload_media", entity_table: "media_files", entity_title: relativePath, metadata: { path: relativePath, contentType: inspection.contentType, size: file.size } });
      return NextResponse.json({
        success: true,
        path: relativePath,
        url: getMediaUrl(relativePath)
      });
    }
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await checkAuthAndRole(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const mediaPath = normalizeRequestedMediaPath(searchParams.get("path") || "");
  if (!mediaPath) {
    return NextResponse.json({ error: "Некорректный путь файла" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const organizationId = (auth as any).organizationId;
  const storageName = mediaPath.split("/").at(-1) || "";
  if (!mediaStorageNameBelongsToOrganization(storageName, organizationId)) {
    console.warn("[security]", { scope: "security", event: "cross_org_denied", resource: "media" });
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
  }
  const usageMap = await resolveMediaUsages(admin, organizationId, [mediaPath]);
  const usages = (usageMap[mediaPath] || []).map((usage) => usage.label);

  if (usages.length > 0) {
    return NextResponse.json({
      ok: false,
      error: "Файл используется и не может быть удален.",
      usages,
    }, { status: 409 });
  }

  const driver = process.env.MEDIA_DRIVER || process.env.NEXT_PUBLIC_MEDIA_DRIVER || "supabase";
  try {
    if (driver === "local") {
      const absolutePath = path.join(getLocalMediaDir(), mediaPath);
      const baseDir = path.resolve(getLocalMediaDir());
      const resolvedPath = path.resolve(absolutePath);
      if (!resolvedPath.startsWith(baseDir)) {
        return NextResponse.json({ error: "Некорректный путь файла" }, { status: 400 });
      }
      if (fs.existsSync(resolvedPath)) fs.unlinkSync(resolvedPath);
    } else {
      const bucketName = process.env.NEXT_PUBLIC_MEDIA_BUCKET || "site-assets";
      const { error } = await admin.storage.from(bucketName).remove([mediaPath]);
      if (error) throw error;
    }

    await admin.from("crm_audit_log").insert({
      organization_id: organizationId,
      actor_id: (auth as any).user?.id || null,
      action: "delete_media",
      entity_table: "media_files",
      entity_id: null,
      entity_title: mediaPath,
      metadata: { path: mediaPath },
    });

    return NextResponse.json({ ok: true, path: mediaPath });
  } catch (err: any) {
    console.error("Delete media error:", err);
    return NextResponse.json({ error: "Не удалось удалить файл" }, { status: 500 });
  }
}
