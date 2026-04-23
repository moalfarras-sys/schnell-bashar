import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const isWindows = process.platform === "win32";
const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const supabaseHost = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
})();

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
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
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
