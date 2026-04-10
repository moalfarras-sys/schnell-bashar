import type { Metadata, Viewport } from "next";
import Link from "next/link";

import { AdminPwaRegister } from "@/components/admin/admin-pwa-register";

export const metadata: Metadata = {
  title: "Admin Anmeldung",
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
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1f44",
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="luxury-bg min-h-screen overflow-x-hidden">
      <AdminPwaRegister />
      <header className="border-b border-[color:var(--line-soft)] bg-[color:var(--surface-elevated)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <span className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
            SSU Admin
          </span>
          <Link
            href="/"
            className="text-xs font-semibold text-sky-700 underline-offset-4 hover:underline dark:text-sky-300"
          >
            Zur Website
          </Link>
        </div>
      </header>
      <main className="relative min-h-[calc(100vh-52px)] overflow-x-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.16),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.16),transparent_40%)] dark:bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.2),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.22),transparent_40%)]" />
        {children}
      </main>
    </div>
  );
}
