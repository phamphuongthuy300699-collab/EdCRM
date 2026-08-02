import fs from "fs";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import sitemap from "../app/sitemap";
import robots from "../app/robots";
import { getPublicSiteConfig, publicSiteUrl } from "../shared/config/public-site";
import {
  buildOrganizationJsonLd,
  buildPublicMetadata,
  resolveHomeSeo,
  safeJsonLdStringify,
} from "../shared/seo/public-metadata";

describe("public SEO configuration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses NEXT_PUBLIC_APP_URL as the normalized canonical origin", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example-school.ru/");
    expect(getPublicSiteConfig()).toMatchObject({ origin: "https://example-school.ru", hostname: "example-school.ru" });
    expect(publicSiteUrl("/contacts")).toBe("https://example-school.ru/contacts");
  });

  it("falls back to the current production punycode host", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(getPublicSiteConfig().origin).toBe("https://xn--48-9kc0bsblm.xn--p1ai");
  });

  it("adds the brand exactly once and builds canonical, social cards and favicon", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example-school.ru");
    const metadata = buildPublicMetadata({
      title: "Курсы робототехники | Робокс Липецк",
      description: "Описание страницы",
      path: "/courses",
      image: "/images/social.webp",
    });

    expect(metadata.title).toBe("Курсы робототехники — Робокс");
    expect(String(metadata.title).match(/Робокс/g)).toHaveLength(1);
    expect(metadata.alternates?.canonical).toBe("https://example-school.ru/courses");
    expect(metadata.openGraph?.url).toBe("https://example-school.ru/courses");
    expect(JSON.stringify(metadata.openGraph?.images)).toContain("https://example-school.ru/images/social.webp");
    expect(metadata.twitter?.card).toBe("summary_large_image");
    expect(JSON.stringify(metadata.icons)).toContain("/favicon.ico");
  });

  it("uses the same origin in sitemap and robots", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example-school.ru/");
    expect(sitemap().every((entry) => entry.url.startsWith("https://example-school.ru"))).toBe(true);
    expect(robots().sitemap).toBe("https://example-school.ru/sitemap.xml");
  });

  it("builds JSON-LD from actual values and escapes closing script input", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example-school.ru");
    const jsonLd = buildOrganizationJsonLd({
      name: "Робокс",
      description: "Школа </script><script>alert(1)</script>",
      phone: "+7 000 000-00-00",
      address: "Тестовый адрес",
      logo: "branding/logo.svg",
      image: "/images/social.webp",
    });

    expect(jsonLd).toMatchObject({
      "@id": "https://example-school.ru/#organization",
      url: "https://example-school.ru",
      logo: "https://example-school.ru/media/branding/logo.svg",
      image: "https://example-school.ru/images/social.webp",
    });
    expect(safeJsonLdStringify(jsonLd)).not.toContain("</script>");
  });

  it("provides safe home metadata when the database block is unavailable", () => {
    expect(resolveHomeSeo(null)).toMatchObject({
      title: "Робототехника и программирование для детей в Липецке",
      description: expect.stringContaining("Курсы робототехники"),
      image: "/og-default.webp",
    });
  });

  it("removes the retired domain from every public SEO source", () => {
    const root = process.cwd();
    const publicRoot = path.join(root, "src/app/(public)");
    const publicSources = fs.readdirSync(publicRoot, { recursive: true })
      .filter((entry) => typeof entry === "string" && /\.(?:ts|tsx)$/.test(entry))
      .map((entry) => path.join(publicRoot, entry));
    const sources = [
      path.join(root, "src/app/layout.tsx"),
      path.join(root, "src/app/robots.ts"),
      path.join(root, "src/app/sitemap.ts"),
      ...publicSources,
    ].map((file) => fs.readFileSync(file, "utf8")).join("\n");
    expect(sources).not.toContain("robotics-lipetsk.ru");
  });
});
