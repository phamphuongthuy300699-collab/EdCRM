import { describe, expect, it } from "vitest";
import { buildSiteImageItem, mergeSiteImageItems, normalizeSiteMediaPath } from "../shared/utils/site-media";

describe("site media helpers", () => {
  it("uses editor-provided title and alt instead of technical filename", () => {
    expect(buildSiteImageItem(
      { path: "student-projects/IMG_20260704_011518.jpg" },
      20,
      { title: "Робот-сумо на занятии", alt: "Ученик тестирует робота-сумо" },
    )).toEqual({
      path: "student-projects/IMG_20260704_011518.jpg",
      title: "Робот-сумо на занятии",
      alt: "Ученик тестирует робота-сумо",
      sortOrder: 20,
    });
  });

  it("falls back to a readable filename title when editor metadata is empty", () => {
    expect(buildSiteImageItem(
      { path: "student-projects/robot_sumo_final.jpg" },
      10,
      { title: "", alt: "" },
    )).toEqual({
      path: "student-projects/robot_sumo_final.jpg",
      title: "robot sumo final",
      alt: "robot sumo final",
      sortOrder: 10,
    });
  });

  it("adds multiple selected files and updates duplicate metadata without reordering existing images", () => {
    expect(mergeSiteImageItems(
      [{ path: "student-projects/old.jpg", title: "Старый проект", alt: "Старый проект", sortOrder: 10 }],
      [
        { path: "student-projects/new_robot.jpg" },
        { path: "student-projects/old.jpg" },
        { path: "student-projects/second_robot.jpg" },
      ],
      {
        "student-projects/old.jpg": { title: "Обновленный проект", alt: "Новое описание" },
      },
    )).toEqual([
      { path: "student-projects/old.jpg", title: "Обновленный проект", alt: "Новое описание", sortOrder: 10 },
      { path: "student-projects/new_robot.jpg", title: "new robot", alt: "new robot", sortOrder: 20 },
      { path: "student-projects/second_robot.jpg", title: "second robot", alt: "second robot", sortOrder: 30 },
    ]);
  });

  it("normalizes Supabase Storage public URLs before saving site content media", () => {
    const fullUrl = "https://akhcnpvhivijdrvohwgd.supabase.co/storage/v1/object/public/site-assets/student-projects/%D0%A0%D0%BE%D0%B1%D0%BE%D1%82.jpg";

    expect(normalizeSiteMediaPath(fullUrl)).toBe("student-projects/Робот.jpg");
    expect(buildSiteImageItem({ url: fullUrl }, 10, { title: "Робот", alt: "Робот" })).toEqual({
      path: "student-projects/Робот.jpg",
      title: "Робот",
      alt: "Робот",
      sortOrder: 10,
    });
  });
});
