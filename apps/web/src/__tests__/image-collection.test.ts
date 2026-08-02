import { describe, expect, it } from "vitest";
import {
  activeCollectionImages,
  normalizeImageCollection,
  normalizeImageLayout,
  moveCollectionImage,
  removeCollectionImage,
  replaceCollectionImage,
} from "../features/site-editor/media/image-collection";

describe("site editor image collections", () => {
  it("normalizes legacy string arrays and stable sort order", () => {
    expect(normalizeImageCollection([
      "facilities/second.webp",
      "facilities/first.webp",
    ])).toEqual([
      {
        path: "facilities/second.webp",
        title: "second",
        alt: "second",
        sortOrder: 10,
        isActive: true,
        objectPosition: "50% 50%",
      },
      {
        path: "facilities/first.webp",
        title: "first",
        alt: "first",
        sortOrder: 20,
        isActive: true,
        objectPosition: "50% 50%",
      },
    ]);
  });

  it("sorts legacy objects and normalizes sortOrder to tens", () => {
    expect(normalizeImageCollection([
      { path: "gallery/last.webp", sortOrder: 90, title: "Последнее" },
      { path: "gallery/first.webp", sortOrder: 5, alt: "Первое" },
    ])).toEqual([
      expect.objectContaining({ path: "gallery/first.webp", sortOrder: 10, alt: "Первое" }),
      expect.objectContaining({ path: "gallery/last.webp", sortOrder: 20, title: "Последнее" }),
    ]);
  });

  it("replaces only the file while preserving position and metadata", () => {
    const images = normalizeImageCollection([
      { path: "gallery/old.webp", title: "Подпись", alt: "Описание", sortOrder: 20, isActive: false, objectPosition: "20% 50%" },
      { path: "gallery/next.webp", sortOrder: 30 },
    ]);

    expect(replaceCollectionImage(images, 0, "gallery/new.webp")[0]).toEqual({
      path: "gallery/new.webp",
      title: "Подпись",
      alt: "Описание",
      sortOrder: 10,
      isActive: false,
      objectPosition: "20% 50%",
    });
  });

  it("removes only the block association and leaves the media library untouched", () => {
    const images = normalizeImageCollection(["gallery/one.webp", "gallery/two.webp"]);
    const mediaFiles = ["gallery/one.webp", "gallery/two.webp"];

    expect(removeCollectionImage(images, 0).map((image) => image.path)).toEqual(["gallery/two.webp"]);
    expect(mediaFiles).toEqual(["gallery/one.webp", "gallery/two.webp"]);
  });

  it("excludes hidden images from public rendering", () => {
    const images = normalizeImageCollection([
      { path: "gallery/visible.webp", isActive: true },
      { path: "gallery/hidden.webp", isActive: false },
    ]);

    expect(activeCollectionImages(images).map((image) => image.path)).toEqual(["gallery/visible.webp"]);
  });

  it("uses safe responsive layout defaults and clamps invalid values", () => {
    expect(normalizeImageLayout(undefined)).toEqual({
      columnsDesktop: 3,
      columnsTablet: 2,
      columnsMobile: 1,
      gap: 16,
      aspectRatio: "4/3",
      objectFit: "cover",
    });
    expect(normalizeImageLayout({ columnsDesktop: 12, columnsTablet: 0, columnsMobile: 4, gap: -3, aspectRatio: "", objectFit: "stretch" as never })).toEqual({
      columnsDesktop: 6,
      columnsTablet: 1,
      columnsMobile: 2,
      gap: 0,
      aspectRatio: "4/3",
      objectFit: "cover",
    });
  });

  it("keeps the same order across repeated normalization and supports accessible moves", () => {
    const firstSave = normalizeImageCollection([
      { path: "gallery/a.webp", sortOrder: 70 },
      { path: "gallery/b.webp", sortOrder: 80 },
      { path: "gallery/c.webp", sortOrder: 90 },
    ]);
    const moved = moveCollectionImage(firstSave, 2, 0);
    const secondSave = normalizeImageCollection(moved);

    expect(secondSave.map(({ path, sortOrder }) => ({ path, sortOrder }))).toEqual([
      { path: "gallery/c.webp", sortOrder: 10 },
      { path: "gallery/a.webp", sortOrder: 20 },
      { path: "gallery/b.webp", sortOrder: 30 },
    ]);
  });

  it("preserves block-specific captions while moving image-backed content items", () => {
    const images = normalizeImageCollection([
      { id: "project-a", image: "student-projects/a.webp", title: "A", badge: "LEGO", description: "Первый проект" },
      { id: "project-b", image: "student-projects/b.webp", title: "B", badge: "Arduino", description: "Второй проект" },
    ]);

    expect(moveCollectionImage(images, 1, 0)[0]).toEqual(expect.objectContaining({
      id: "project-b",
      path: "student-projects/b.webp",
      badge: "Arduino",
      description: "Второй проект",
      sortOrder: 10,
    }));
  });
});
