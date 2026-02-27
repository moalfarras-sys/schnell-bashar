import type { Metadata, Viewport } from "next";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AdminPwaRegister } from "@/components/admin/admin-pwa-register";

export const metadata: Metadata = {
  title: "Admin Login",
  manifest: "/admin/manifest.webmanifest",
  icons: {
    apple: "/admin/pwa-icon-192.png",
    icon: [
      { url: "/admin/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/admin/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SSU Admin",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1f44",
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="luxury-bg min-h-screen">
      <AdminPwaRegister />
      <SiteHeader />
      <main className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.16),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.16),transparent_40%)] dark:bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.2),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.22),transparent_40%)]" />
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
