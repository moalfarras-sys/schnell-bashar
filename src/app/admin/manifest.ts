import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SSU Admin",
    short_name: "SSU Admin",
    description: "Admin-App für Schnell Sicher Umzug",
    start_url: "/admin/",
    scope: "/admin/",
    display: "standalone",
    background_color: "#071126",
    theme_color: "#0b1f44",
    icons: [
      {
        src: "/admin/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/admin/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
