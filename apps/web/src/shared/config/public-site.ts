export const FALLBACK_PUBLIC_ORIGIN = "https://xn--48-9kc0bsblm.xn--p1ai";

function normalizeOrigin(value: string | undefined) {
  const candidate = String(value || "").trim() || FALLBACK_PUBLIC_ORIGIN;
  try {
    const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
    if (process.env.NODE_ENV === "production") url.protocol = "https:";
    return url.origin.replace(/\/$/, "");
  } catch {
    return FALLBACK_PUBLIC_ORIGIN;
  }
}

export function getPublicSiteConfig() {
  const origin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  return {
    origin,
    hostname: new URL(origin).hostname,
    organizationSlug: process.env.NEXT_PUBLIC_DEFAULT_ORG_SLUG || process.env.DEFAULT_ORG_SLUG || "robotics-lipetsk",
    canonicalBaseUrl: origin,
  };
}

export function publicSiteUrl(pathname = "/") {
  const { origin } = getPublicSiteConfig();
  const normalizedPath = `/${String(pathname || "").replace(/^\/+/, "")}`;
  return normalizedPath === "/" ? origin : `${origin}${normalizedPath}`;
}

export function publicAssetUrl(value: string | null | undefined, fallback = "/og-default.webp") {
  const asset = String(value || "").trim() || fallback;
  try {
    return new URL(asset).toString();
  } catch {
    if (asset.startsWith("/")) return publicSiteUrl(asset);
    const encodedPath = asset.split("/").map(encodeURIComponent).join("/");
    return publicSiteUrl(`/media/${encodedPath}`);
  }
}
