import type { Metadata } from "next";
import { publicAssetUrl, publicSiteUrl } from "@/shared/config/public-site";

export const PUBLIC_BRAND_NAME = "Робокс";
export const DEFAULT_HOME_TITLE = "Робототехника и программирование для детей в Липецке";
export const DEFAULT_HOME_DESCRIPTION = "Курсы робототехники, Scratch, Python и Arduino для детей 6–14 лет в Липецке. Запись на бесплатное пробное занятие в мини-группе.";

function titleWithoutBrand(value: string) {
  let title = String(value || "").trim();
  const suffix = /\s*(?:[|—–-]\s*)?(?:Робокс(?:\s+Липецк)?|Школа Robotics(?:\s+Липецк)?)\s*$/i;
  while (suffix.test(title) && title.toLocaleLowerCase("ru") !== PUBLIC_BRAND_NAME.toLocaleLowerCase("ru")) {
    title = title.replace(suffix, "").trim();
  }
  return title || DEFAULT_HOME_TITLE;
}

export function brandedPublicTitle(value: string) {
  const title = titleWithoutBrand(value);
  return title === PUBLIC_BRAND_NAME ? title : `${title} — ${PUBLIC_BRAND_NAME}`;
}

export function buildPublicMetadata({
  title,
  description,
  path = "/",
  image = "/og-default.webp",
  favicon = "/favicon.ico",
  noIndex = false,
}: {
  title: string;
  description: string;
  path?: string;
  image?: string | null;
  favicon?: string | null;
  noIndex?: boolean;
}): Metadata {
  const finalTitle = brandedPublicTitle(title);
  const canonical = publicSiteUrl(path);
  const socialImage = publicAssetUrl(image);
  const faviconUrl = favicon?.startsWith("/") ? favicon : favicon ? publicAssetUrl(favicon, "/favicon.ico") : "/favicon.ico";

  return {
    title: finalTitle,
    description,
    alternates: { canonical },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    icons: {
      icon: [{ url: faviconUrl || "/favicon.ico" }, { url: "/favicon.svg", type: "image/svg+xml" }],
      shortcut: "/favicon.ico",
    },
    openGraph: {
      title: finalTitle,
      description,
      url: canonical,
      siteName: PUBLIC_BRAND_NAME,
      locale: "ru_RU",
      type: "website",
      images: [{ url: socialImage, width: 1200, height: 630, alt: finalTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: finalTitle,
      description,
      images: [socialImage],
    },
  };
}

export function resolveHomeSeo(block: { title?: string | null; subtitle?: string | null; content?: Record<string, unknown> | null } | null | undefined) {
  const content = block?.content || {};
  return {
    title: String(block?.title || "").trim() || DEFAULT_HOME_TITLE,
    description: String(block?.subtitle || "").trim() || DEFAULT_HOME_DESCRIPTION,
    image: String(content.ogImage || content.socialImage || "").trim() || "/og-default.webp",
    favicon: String(content.favicon || "").trim() || "/favicon.ico",
  };
}

export function buildOrganizationJsonLd({
  name,
  description,
  phone,
  address,
  logo,
  image,
}: {
  name: string;
  description: string;
  phone?: string | null;
  address?: string | null;
  logo?: string | null;
  image?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": ["EducationalOrganization", "LocalBusiness"],
    "@id": `${publicSiteUrl("/")}/#organization`,
    name,
    url: publicSiteUrl("/"),
    logo: publicAssetUrl(logo, "/favicon.svg"),
    image: publicAssetUrl(image, "/og-default.webp"),
    description,
    ...(phone ? { telephone: phone } : {}),
    ...(address ? { address: { "@type": "PostalAddress", streetAddress: address, addressLocality: "Липецк", addressCountry: "RU" } } : {}),
  };
}

export function safeJsonLdStringify(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
