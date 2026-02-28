import type { MetadataRoute } from "next";
import { cities } from "@/data/cities";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://schnellsicherumzug.de";

const routes = [
  "",
  "/umzug",
  "/entsorgung",
  "/montage",
  "/preise",
  "/kalender",
  "/booking",
  "/anfrage",
  "/galerie",
  "/faq",
  "/tipps",
  "/ueber-uns",
  "/kontakt",
  "/agb",
  "/datenschutz",
  "/impressum",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const baseEntries = routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
    priority: route === "" ? 1 : route === "/booking" || route === "/preise" ? 0.9 : 0.7,
  }));

  const cityEntries = cities.map((city) => ({
    url: `${baseUrl}/staedte/${city.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...baseEntries, ...cityEntries];
}
