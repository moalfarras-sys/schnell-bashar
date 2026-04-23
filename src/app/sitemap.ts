import type { MetadataRoute } from "next";

const baseUrl = "https://schnellsicherumzug.de";

const routes = [
  "",
  "/umzug",
  "/entsorgung",
  "/montage",
  "/preise",
  "/faq",
  "/galerie",
  "/booking",
  "/impressum",
  "/datenschutz",
  "/agb",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
    priority: route === "" ? 1 : route === "/booking" || route === "/preise" ? 0.9 : 0.7,
  }));
}
