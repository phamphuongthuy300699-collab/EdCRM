import { MetadataRoute } from "next";
import { publicSiteUrl } from "@/shared/config/public-site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/crm",
        "/crm/",
        "/login",
        "/login/",
        "/teacher",
        "/teacher/",
        "/parent",
        "/parent/",
        "/student",
        "/student/",
        "/api/",
      ],
    },
    sitemap: publicSiteUrl("/sitemap.xml"),
  };
}
