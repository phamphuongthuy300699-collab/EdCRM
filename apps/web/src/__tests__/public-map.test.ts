import { describe, expect, it } from "vitest";
import { buildYandexMapEmbedUrl } from "../shared/utils/public-map";

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
});
