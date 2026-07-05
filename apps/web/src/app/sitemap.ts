import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://робокс48.рф";
  
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
    "/legal",
    "/privacy",
    "/offer",
    "/payment",
    "/refund",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));
}
