type SiteMediaFile = {
  path?: string | null;
  name?: string | null;
};

type SiteMediaMeta = {
  title?: string | null;
  alt?: string | null;
};

function mediaNameFromPath(path: string) {
  return path.split("/").pop() || path;
}

export function readableMediaTitle(path: string) {
  return mediaNameFromPath(path).replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
}

export function buildSiteImageItem(file: SiteMediaFile, sortOrder: number, meta: SiteMediaMeta = {}) {
  const path = String(file.path || "").trim();
  const fallbackTitle = readableMediaTitle(path);
  const title = String(meta.title || "").trim() || fallbackTitle;
  const alt = String(meta.alt || "").trim() || title;

  return {
    path,
    title,
    alt,
    sortOrder,
  };
}
