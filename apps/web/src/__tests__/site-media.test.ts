import { describe, expect, it } from "vitest";
import { buildSiteImageItem } from "../shared/utils/site-media";

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
});
