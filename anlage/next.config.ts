import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  assetPrefix: "/pdf-anlage",
  serverExternalPackages: ["@sparticuz/chromium-min"],
  turbopack: {
    root: process.cwd()
  },
  async rewrites() {
    return [
      {
        source: "/pdf-anlage/:path*",
        destination: "/:path*"
      }
    ];
  }
};

export default nextConfig;
