import { describe, expect, it } from "vitest";
import {
  buildYandexStaticMapUrl,
  publicFooterMapBranches,
  publicMapBranches,
  resolveBranchMapMarkers,
} from "../shared/utils/public-map";

describe("public map helpers", () => {
  it("resolves separate markers and map links for the real Lipetsk branches", () => {
    const markers = resolveBranchMapMarkers([
      { name: "Осканова", address: "Липецк, ул. Осканова, 3" },
      { name: "Славянова", address: "Липецк, ул. Славянова, 1" },
      { name: "Без адреса", address: "" },
    ]);

    expect(markers).toHaveLength(2);
    expect(markers[0]).toMatchObject({
      address: "Липецк, ул. Осканова, 3",
      lat: 52.596328,
      lng: 39.4900857,
    });
    expect(markers[1]).toMatchObject({
      address: "Липецк, ул. Славянова, 1",
      lat: 52.6064322,
      lng: 39.5048586,
    });
    expect(new URL(markers[0].openUrl).searchParams.get("text")).toBe("Липецк, ул. Осканова, 3");
    expect(new URL(markers[1].openUrl).searchParams.get("text")).toBe("Липецк, ул. Славянова, 1");
  });

  it("builds a static map URL with one point per marker", () => {
    const markers = resolveBranchMapMarkers([
      { name: "Осканова", address: "Липецк, ул. Осканова, 3" },
      { name: "Славянова", address: "Липецк, ул. Славянова, 1" },
    ]);

    const url = buildYandexStaticMapUrl(markers, { width: 650, height: 300 });
    const pointText = new URL(url).searchParams.get("pt") || "";

    expect(url).toContain("https://static-maps.yandex.ru/1.x/");
    expect(pointText).toContain("39.4900857,52.596328");
    expect(pointText).toContain("39.5048586,52.6064322");
    expect(pointText.split("~")).toHaveLength(2);
  });

  it("uses coordinates from branch map links for newly added branches", () => {
    const markers = resolveBranchMapMarkers([
      {
        name: "Новый филиал",
        address: "Липецк, новый адрес",
        map_url: "https://yandex.ru/maps/9/lipetsk/?ll=39.600000%2C52.610000&z=16",
      },
    ]);

    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({
      address: "Липецк, новый адрес",
      lat: 52.61,
      lng: 39.6,
    });
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
