import type { NextConfig } from "next";

const isWindows = process.platform === "win32";

const nextConfig: NextConfig = {
  // Standalone build is ideal for Linux VPS deployments.
  // On Windows, Next may generate traced filenames with ":" which can break copy.
  output: isWindows ? undefined : "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["pdfkit", "docusign-esign"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/media/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
