import { describe, expect, it } from "vitest";
import { inspectMediaUpload } from "@/lib/security/media-upload";

const bytes = (...values: number[]) => Buffer.from(values);

describe("media upload inspection", () => {
  it("rejects oversized files before storage", () => {
    expect(inspectMediaUpload({ folder: "hero", originalName: "large.jpg", declaredType: "image/jpeg", size: 10_000_001, bytes: bytes(0xff, 0xd8, 0xff), maxBytes: 8_000_000 })).toMatchObject({ ok: false, status: 413 });
  });

  it("rejects HTML renamed as JPEG and scripted SVG", () => {
    expect(inspectMediaUpload({ folder: "hero", originalName: "photo.jpg", declaredType: "image/jpeg", size: 20, bytes: Buffer.from("<html><script>"), maxBytes: 8_000_000 }).ok).toBe(false);
    expect(inspectMediaUpload({ folder: "hero", originalName: "x.svg", declaredType: "image/svg+xml", size: 20, bytes: Buffer.from("<svg><script>"), maxBytes: 8_000_000 }).ok).toBe(false);
  });

  it("rejects traversal and accepts a valid WebP with a server filename", () => {
    expect(inspectMediaUpload({ folder: "../hero", originalName: "../evil.webp", declaredType: "image/webp", size: 12, bytes: Buffer.from("RIFFxxxxWEBP"), maxBytes: 8_000_000 }).ok).toBe(false);
    const result = inspectMediaUpload({ folder: "hero", originalName: "same-name.webp", declaredType: "image/webp", size: 12, bytes: Buffer.from("RIFFxxxxWEBP"), maxBytes: 8_000_000 });
    expect(result).toMatchObject({ ok: true, contentType: "image/webp", extension: "webp" });
    if (result.ok) expect(result.storageName).not.toBe("same-name.webp");
  });
});
