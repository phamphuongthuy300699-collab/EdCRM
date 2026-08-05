import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("CRM-backed public site content", () => {
  it("renders every existing home.hero value in the real public JSX", () => {
    const landing = read("src/app/(public)/LandingPageClient.tsx");
    expect(landing).toContain("{heroTitle}");
    expect(landing).toContain("{heroSubtitle}");
    expect(landing).toContain("{heroBadge}");
    expect(landing).toContain("{heroCtaText}");
    expect(landing).toContain("{heroSecondaryCtaText}");
    expect(landing).toContain("heroBullets.map");
  });

  it("loads and saves the existing secondary CTA field in CRM", () => {
    const editor = read("src/app/(crm)/crm/site/page.tsx");
    expect(editor).toContain("heroSecondaryCtaText");
    expect(editor).toContain("secondaryCtaText: heroSecondaryCtaText");
  });

  it("uses course_tariffs as the only public price source", () => {
    const landing = read("src/app/(public)/LandingPageClient.tsx");
    const editor = read("src/app/(crm)/crm/site/page.tsx");
    expect(landing).not.toContain("trialPrice");
    expect(landing).not.toContain("monthlyPrice");
    expect(landing).not.toContain("individualPrice");
    expect(landing).toContain("initialTariffs");
    expect(editor).toContain("Цены редактируются в разделе “Направления и цены”");
  });
});
