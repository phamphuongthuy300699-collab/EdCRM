type SiteMediaFile = {
  path?: string | null;
  name?: string | null;
};

type SiteMediaMeta = {
  title?: string | null;
  alt?: string | null;
};

type SiteImageItem = {
  path: string;
  title: string;
  alt: string;
  sortOrder: number;
};

type SiteMediaMetaByPath = Record<string, SiteMediaMeta | undefined>;

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

export function mergeSiteImageItems(
  currentImages: SiteImageItem[],
  files: SiteMediaFile[],
  metaByPath: SiteMediaMetaByPath = {},
) {
  const merged = [...currentImages];

  files.forEach((file) => {
    const path = String(file.path || "").trim();
    if (!path) return;

    const existingIndex = merged.findIndex((item) => item.path === path);
    if (existingIndex >= 0) {
      merged[existingIndex] = buildSiteImageItem(file, merged[existingIndex].sortOrder, metaByPath[path]);
      return;
    }

    merged.push(buildSiteImageItem(file, (merged.length + 1) * 10, metaByPath[path]));
  });

  return merged;
}
