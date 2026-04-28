import type { MetadataRoute } from "next";

import { cities } from "@/data/cities";

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
  "/buchen",
  "/kontakt",
  "/kalender",
  "/karriere",
  "/meine-anfrage",
  "/tipps",
  "/umzugsplaner",
  "/vergleich",
  "/impressum",
  "/datenschutz",
  "/agb",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" || route === "/preise" || route === "/booking" ? ("weekly" as const) : ("monthly" as const),
    priority: route === "" ? 1 : route === "/booking" || route === "/buchen" || route === "/preise" ? 0.9 : 0.7,
  }));
  const cityRoutes = cities.map((city) => ({
    url: `${baseUrl}/staedte/${city.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: city.slug === "berlin" ? 0.9 : 0.65,
  }));

  return [...staticRoutes, ...cityRoutes];
}
