import { NextResponse } from "next/server";

const manifest = {
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

export function GET() {
  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

