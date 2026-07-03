import { describe, expect, it } from "vitest";
import { buildYandexMapEmbedUrl, publicFooterMapBranches, publicMapBranches } from "../shared/utils/public-map";

describe("public map helpers", () => {
  it("builds a Yandex map search URL from visible branch addresses", () => {
    const url = buildYandexMapEmbedUrl([
      { name: "Центр", address: "Липецк, ул. Неделина, 15" },
      { name: "Сокол", address: "Липецк, проспект Победы, 29" },
      { name: "Без адреса", address: "" },
    ]);

    expect(url).toContain("https://yandex.ru/map-widget/v1/");
    expect(url).toContain("mode=search");
    const searchText = new URL(url).searchParams.get("text") || "";
    expect(searchText).toContain("Липецк, ул. Неделина, 15");
    expect(searchText).toContain("Липецк, проспект Победы, 29");
    expect(searchText).not.toContain("Без адреса");
  });

  it("returns an empty URL when there are no branch addresses", () => {
    expect(buildYandexMapEmbedUrl([{ name: "Филиал", address: "" }])).toBe("");
  });

  it("uses the same visible active branches as public address text", () => {
    const branches = publicMapBranches([
      { name: "Старый формат", address: "Липецк, ул. Осканова, 3", is_active: true, show_on_site: null },
      { name: "Скрытый", address: "Липецк, скрытый адрес", is_active: true, show_on_site: false },
      { name: "Архивный", address: "Липецк, архивный адрес", is_active: false, show_on_site: true },
    ]);

    expect(branches.map((branch) => branch.address)).toEqual(["Липецк, ул. Осканова, 3"]);
  });

  it("falls back to the organization address when footer branches are unavailable", () => {
    const branches = publicFooterMapBranches(
      [{ name: "Скрытый", address: "Липецк, скрытый адрес", is_active: true, show_on_site: false }],
      "398057, Липецк, ул. Артемова, 5а",
      "Робокс"
    );

    expect(branches).toEqual([{ name: "Робокс", address: "398057, Липецк, ул. Артемова, 5а" }]);
  });
});
