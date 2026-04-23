export async function GET() {
  return new Response(
    JSON.stringify({
      name: "Schnell Sicher Umzug",
      short_name: "SSU",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#0f172a",
      icons: [
        {
          src: "/media/brand/hero-logo.jpeg",
          sizes: "192x192",
          type: "image/jpeg",
        },
      ],
    }),
    {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
      },
    },
  );
}
