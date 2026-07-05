import { MetadataRoute } from "next";

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
    sitemap: "https://робокс48.рф/sitemap.xml",
  };
}
