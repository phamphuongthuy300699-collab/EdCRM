import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { defaultFooterLinks, safePublicNavLinks } from "../shared/utils/public-navigation";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("editable public navigation", () => {
  it("filters CRM links and keeps the public teachers anchor in fallback navigation", () => {
    const links = safePublicNavLinks(
      [
        { id: "bad", title: "CRM", href: "/crm/site", enabled: true, sortOrder: 10 },
        { id: "teachers", title: "Преподаватели", href: "/#teachers", enabled: true, sortOrder: 20 },
      ],
      defaultFooterLinks,
    );

    expect(links.some((link) => link.href.startsWith("/crm"))).toBe(false);
    expect(links.find((link) => link.id === "teachers")?.href).toBe("/#teachers");
  });

  it("loads public header and footer links from site.navigation", () => {
    const layout = read("src/app/(public)/layout.tsx");
    const header = read("src/app/(public)/Header.tsx");

    expect(layout).toContain('"site.navigation"');
    expect(layout).toContain("safePublicNavLinks(navBlock.content.headerLinks");
    expect(layout).toContain("safePublicNavLinks(navBlock.content.footerLinks");
    expect(layout).toContain("headerLinks={headerLinks}");
    expect(layout).toContain("footerLinks.map");
    expect(header).toContain("headerLinks.map");
    expect(layout).not.toContain('href="/teachers"');
  });

  it("exposes the site.navigation editor in CRM and seeds defaults idempotently", () => {
    const crmSite = read("src/app/(crm)/crm/site/page.tsx");
    const migration = read("../../supabase/migrations/20260709000001_site_navigation.sql");

    expect(crmSite).toContain('"navigation"');
    expect(crmSite).toContain('"site.navigation"');
    expect(crmSite).toContain("headerNavLinks");
    expect(crmSite).toContain("footerNavLinks");
    expect(migration).toContain("'site.navigation'");
    expect(migration.toLowerCase()).toContain("on conflict");
    expect(migration).toContain('"/#teachers"');
    expect(migration).not.toContain('"/crm');
  });
});
