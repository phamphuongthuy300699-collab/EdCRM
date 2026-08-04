import { normalizeSiteMediaPath, readableMediaTitle } from "./site-media";

export type ContentImage = {
  path: string;
  title: string;
  alt: string;
  objectPosition: string;
};

export function normalizeContentImage(value: unknown): ContentImage | null {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  if (record.isActive === false) return null;
  const rawPath = typeof value === "string" ? value : record.path || record.image || record.url || record.publicUrl || "";
  const path = normalizeSiteMediaPath(String(rawPath || ""));
  if (!path) return null;
  const fallbackTitle = readableMediaTitle(path);
  const title = String(record.title || "").trim() || fallbackTitle;
  return {
    path,
    title,
    alt: String(record.alt || "").trim() || title,
    objectPosition: String(record.objectPosition || "").trim() || "50% 50%",
  };
}

function visibleImages(value: unknown) {
  return Array.isArray(value) ? value.map(normalizeContentImage).filter(Boolean) as ContentImage[] : [];
}

export function resolveFacilitiesMedia(
  facilitiesContent: Record<string, unknown> | null | undefined,
  equipmentContent: Record<string, unknown> | null | undefined,
) {
  const facilities = facilitiesContent || {};
  const equipment = equipmentContent || {};
  const legacyFacilities = visibleImages(facilities.images);
  const legacyEquipment = visibleImages(equipment.images);
  return {
    mainImage: normalizeContentImage(facilities.mainImage) || legacyFacilities[0] || null,
    equipmentImage: normalizeContentImage(facilities.equipmentImage) || legacyEquipment[0] || null,
    workspaceImage: normalizeContentImage(facilities.workspaceImage) || legacyEquipment[1] || null,
  };
}

export function resolveContactsMedia(content: Record<string, unknown> | null | undefined) {
  const source = content || {};
  return {
    mapImage: normalizeContentImage(source.mapImage),
    facadeImage: normalizeContentImage(source.facadeImage),
    classroomImage: normalizeContentImage(source.classroomImage),
    images: visibleImages(source.images),
  };
}

export function serializeContentImage(image: ContentImage | null | undefined) {
  return image ? { path: image.path, title: image.title, alt: image.alt, objectPosition: image.objectPosition } : null;
}
