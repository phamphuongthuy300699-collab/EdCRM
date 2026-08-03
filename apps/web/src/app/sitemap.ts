import { MetadataRoute } from "next";
import { publicSiteUrl } from "@/shared/config/public-site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/robototekhnika-dlya-detey-lipetsk",
    "/programmirovanie-dlya-detey-lipetsk",
    "/scratch-dlya-detey-lipetsk",
    "/python-dlya-detey-lipetsk",
    "/arduino-dlya-detey-lipetsk",
    "/probnoe-zanyatie",
    "/raspisanie",
    "/stoimost",
    "/contacts",
    "/teachers",
    "/legal",
    "/privacy",
    "/privacy-policy",
    "/consent",
    "/offer",
    "/payment",
    "/refund",
  ];

  return routes.map((route) => ({
    url: publicSiteUrl(route || "/"),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));
}
