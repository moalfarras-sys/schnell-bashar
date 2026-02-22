import type { MetadataRoute } from "next";
import { cities } from "@/data/cities";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://schnellumzug-berlin.de";

const routes = [
  "",
  "/umzug",
  "/entsorgung",
  "/preise",
  "/kalender",
  "/buchung/termin",
  "/anfrage",
  "/galerie",
  "/faq",
  "/ueber-uns",
  "/kontakt",
  "/buchen",
  "/agb",
  "/datenschutz",
  "/impressum",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const baseEntries = routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: (route === "" ? "weekly" : "monthly") as "weekly" | "monthly",
    priority: route === "" ? 1 : 0.7,
  }));

  const cityEntries = cities.map((city) => ({
    url: `${baseUrl}/staedte/${city.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...baseEntries, ...cityEntries];
}
