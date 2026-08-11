import crypto from "node:crypto";

const imageFolders = new Set(["branding", "hero", "course-cards", "teachers", "facilities", "student-projects", "lesson-process", "equipment", "contacts", "footer", "misc"]);

type Input = { folder: string; originalName: string; declaredType: string; size: number; bytes: Uint8Array; maxBytes: number };
type Rejection = { ok: false; status: 400 | 413; code: string };
type Acceptance = { ok: true; contentType: string; extension: string; storageName: string };

function starts(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function detectedType(bytes: Uint8Array) {
  if (starts(bytes, [0xff, 0xd8, 0xff])) return { contentType: "image/jpeg", extension: "jpg" };
  if (starts(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { contentType: "image/png", extension: "png" };
  if (Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP") return { contentType: "image/webp", extension: "webp" };
  if (Buffer.from(bytes.subarray(0, 5)).toString("ascii") === "%PDF-") return { contentType: "application/pdf", extension: "pdf" };
  return null;
}

export function inspectMediaUpload(input: Input): Acceptance | Rejection {
  if (input.size > input.maxBytes) return { ok: false, status: 413, code: "MEDIA_TOO_LARGE" };
  if (!input.folder || input.folder.includes("..") || input.originalName.includes("..") || input.originalName.includes("\0") || input.originalName.startsWith("/") || input.originalName.startsWith("\\")) {
    return { ok: false, status: 400, code: "INVALID_MEDIA_PATH" };
  }
  const detected = detectedType(input.bytes);
  if (!detected) return { ok: false, status: 400, code: "INVALID_MEDIA_CONTENT" };
  const folderAllowed = input.folder === "documents" ? detected.contentType === "application/pdf" : imageFolders.has(input.folder) && detected.contentType.startsWith("image/");
  if (!folderAllowed || input.declaredType !== detected.contentType) return { ok: false, status: 400, code: "MEDIA_TYPE_MISMATCH" };
  return { ok: true, ...detected, storageName: `${crypto.randomUUID()}.${detected.extension}` };
}

export function namespaceMediaStorageName(organizationId: string, storageName: string) {
  return `${organizationId}--${storageName}`;
}

export function mediaStorageNameBelongsToOrganization(storageName: string, organizationId: string) {
  return storageName.startsWith(`${organizationId}--`);
}
