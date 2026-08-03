import { normalizeSiteMediaPath, readableMediaTitle } from "@/shared/utils/site-media";
import type { ImageCollectionItem, ImageCollectionLayout } from "./types";

export const DEFAULT_IMAGE_COLLECTION_LAYOUT: ImageCollectionLayout = {
  columnsDesktop: 3,
  columnsTablet: 2,
  columnsMobile: 1,
  gap: 16,
  aspectRatio: "4/3",
  objectFit: "cover",
};

function clamp(value: unknown, minimum: number, maximum: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}

export function normalizeImageLayout(value: Partial<ImageCollectionLayout> | null | undefined): ImageCollectionLayout {
  return {
    columnsDesktop: clamp(value?.columnsDesktop, 1, 6, DEFAULT_IMAGE_COLLECTION_LAYOUT.columnsDesktop),
    columnsTablet: clamp(value?.columnsTablet, 1, 4, DEFAULT_IMAGE_COLLECTION_LAYOUT.columnsTablet),
    columnsMobile: clamp(value?.columnsMobile, 1, 2, DEFAULT_IMAGE_COLLECTION_LAYOUT.columnsMobile),
    gap: clamp(value?.gap, 0, 48, DEFAULT_IMAGE_COLLECTION_LAYOUT.gap),
    aspectRatio: String(value?.aspectRatio || "").trim() || DEFAULT_IMAGE_COLLECTION_LAYOUT.aspectRatio,
    objectFit: value?.objectFit === "contain" ? "contain" : "cover",
  };
}

export function normalizeImageCollection(value: unknown): ImageCollectionItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((raw, originalIndex) => {
      const record = typeof raw === "string" ? {} : (raw && typeof raw === "object" ? raw as Record<string, unknown> : {});
      const rawPath = typeof raw === "string" ? raw : record.path || record.image || record.url || record.publicUrl || "";
      const path = normalizeSiteMediaPath(String(rawPath || ""));
      if (!path) return null;
      const fallbackTitle = readableMediaTitle(path);
      const extras = { ...record };
      ["path", "image", "url", "publicUrl", "title", "alt", "sortOrder", "isActive", "objectPosition"].forEach((key) => delete extras[key]);

      return {
        ...extras,
        path,
        title: String(record.title || "").trim() || fallbackTitle,
        alt: String(record.alt || "").trim() || String(record.title || "").trim() || fallbackTitle,
        sortOrder: Number.isFinite(Number(record.sortOrder)) ? Number(record.sortOrder) : (originalIndex + 1) * 10,
        isActive: record.isActive !== false,
        objectPosition: String(record.objectPosition || "").trim() || "50% 50%",
        originalIndex,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => left.sortOrder - right.sortOrder || left.originalIndex - right.originalIndex)
    .map(({ originalIndex: _originalIndex, ...item }, index) => ({ ...item, sortOrder: (index + 1) * 10 }));
}

export function activeCollectionImages(value: unknown) {
  return normalizeImageCollection(value).filter((image) => image.isActive);
}

export function replaceCollectionImage(images: ImageCollectionItem[], index: number, path: string) {
  const normalized = normalizeImageCollection(images);
  if (!normalized[index]) return normalized;
  normalized[index] = { ...normalized[index], path: normalizeSiteMediaPath(path) };
  return normalizeImageCollection(normalized);
}

export function removeCollectionImage(images: ImageCollectionItem[], index: number) {
  return normalizeImageCollection(images.filter((_image, imageIndex) => imageIndex !== index));
}

export function moveCollectionImage(images: ImageCollectionItem[], fromIndex: number, toIndex: number) {
  const normalized = normalizeImageCollection(images);
  if (!normalized[fromIndex] || toIndex < 0 || toIndex >= normalized.length || fromIndex === toIndex) return normalized;
  const [moved] = normalized.splice(fromIndex, 1);
  normalized.splice(toIndex, 0, moved);
  return normalized.map((image, index) => ({ ...image, sortOrder: (index + 1) * 10 }));
}
