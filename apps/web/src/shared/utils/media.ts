/**
 * Media asset storage URL resolver.
 * Sourced from Supabase Storage bucket `site-assets` in develop mode,
 * and locally served via `/media/` prefix in production mode.
 */
export function getMediaUrl(path: string): string {
  // Use env setting MEDIA_DRIVER. Fallback to 'supabase' in dev, or 'local' if configured.
  const driver = process.env.MEDIA_DRIVER || process.env.NEXT_PUBLIC_MEDIA_DRIVER || "supabase";

  if (driver === "local") {
    // Production local disk directory mapping
    return `/media/${path}`;
  }

  // Develop: Supabase Storage public bucket URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://akhcnpvhivijdrvohwgd.supabase.co";
  
  // Strip trailing slashes if present
  const normalizedBaseUrl = supabaseUrl.endsWith("/") ? supabaseUrl.slice(0, -1) : supabaseUrl;
  const bucketName = process.env.NEXT_PUBLIC_MEDIA_BUCKET || "site-assets";

  return `${normalizedBaseUrl}/storage/v1/object/public/${bucketName}/${path}`;
}
