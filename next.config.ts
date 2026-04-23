import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const isWindows = process.platform === "win32";
const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";
const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: isWindows || isVercel ? undefined : "standalone",
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: ["pdfkit", "docusign-esign"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  turbopack: {
    root: rootDir,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/media/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
