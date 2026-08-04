import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LandingPageClient from "../app/(public)/LandingPageClient";
import { createSiteMediaDrafts } from "../features/site-editor/media/site-media-slots";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("canonical facilities media", () => {
  it("loads three canonical positions and keeps the legacy two-block fallback", () => {
    const canonical = createSiteMediaDrafts([
      {
        block_key: "home.facilities",
        content: {
          mainImage: { path: "facilities/main.webp", title: "Большой класс", alt: "Дети в классе" },
          equipmentImage: { path: "equipment/lego.webp", title: "LEGO", alt: "Наборы LEGO" },
          workspaceImage: { path: "facilities/workspace.webp", title: "Рабочая зона", alt: "Столы учеников" },
        },
      },
    ]);

    expect(canonical["facilities-main"].image?.path).toBe("facilities/main.webp");
    expect(canonical["facilities-equipment"].image?.title).toBe("LEGO");
    expect(canonical["facilities-workspace"].image?.alt).toBe("Столы учеников");

    const legacy = createSiteMediaDrafts([
      { block_key: "home.facilities", content: { images: [{ path: "facilities/legacy-main.webp", title: "Старый класс" }] } },
      { block_key: "home.equipment", content: { images: ["equipment/legacy-top.webp", "equipment/legacy-bottom.webp"] } },
    ]);

    expect(legacy["facilities-main"].image?.path).toBe("facilities/legacy-main.webp");
    expect(legacy["facilities-equipment"].image?.path).toBe("equipment/legacy-top.webp");
    expect(legacy["facilities-workspace"].image?.path).toBe("equipment/legacy-bottom.webp");
  });

  it("uses one shared public composition in the site and CRM preview", () => {
    const landing = read("src/app/(public)/LandingPageClient.tsx");
    const editor = read("src/features/site-editor/media/FacilitiesBlockEditor.tsx");
    expect(landing).toContain("<FacilitiesGallery");
    expect(editor).toContain("<FacilitiesGallery");
  });
});

describe("contacts media isolation", () => {
  it("does not borrow facilities or equipment when contact slots are empty", () => {
    const { container } = render(<LandingPageClient initialBlocks={[
      { block_key: "home.facilities", content: { mainImage: { path: "facilities/private.webp" } } },
      { block_key: "home.equipment", content: { images: ["equipment/private.webp"] } },
      { block_key: "contacts.media", content: {} },
    ]} />);

    const contacts = container.querySelector("#contacts");
    const styles = Array.from(contacts?.querySelectorAll<HTMLElement>("[style]") || []).map((node) => node.getAttribute("style") || "").join("\n");
    expect(styles).not.toContain("facilities/private.webp");
    expect(styles).not.toContain("equipment/private.webp");
  });

  it("does not render a contact image explicitly hidden in CRM", () => {
    const { container } = render(<LandingPageClient initialBlocks={[
      {
        block_key: "contacts.media",
        content: {
          facadeImage: { path: "contacts/hidden.webp", title: "Фасад", isActive: false },
          classroomImage: { path: "contacts/classroom.webp", title: "Класс", alt: "Учебный класс" },
        },
      },
    ]} />);

    const contacts = container.querySelector("#contacts");
    const styles = Array.from(contacts?.querySelectorAll<HTMLElement>("[style]") || []).map((node) => node.getAttribute("style") || "").join("\n");
    expect(styles).not.toContain("contacts/hidden.webp");
    expect(styles).toContain("contacts/classroom.webp");
  });
});
