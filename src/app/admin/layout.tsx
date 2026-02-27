import type { Metadata, Viewport } from "next";
import Link from "next/link";

import { logoutAction } from "@/app/admin/actions";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminPwaRegister } from "@/components/admin/admin-pwa-register";
import { prisma } from "@/server/db/prisma";

export const metadata: Metadata = {
  title: "Admin",
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

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let newOrderCount = 0;
  try {
    newOrderCount = await prisma.order.count({ where: { status: "NEW" } });
  } catch {
    /* DB unavailable - nav still renders */
  }

  return (
    <div className="luxury-bg min-h-screen text-slate-900 dark:text-slate-100">
      <AdminPwaRegister />

      <header className="sticky top-0 z-50 border-b border-[color:var(--line-soft)] bg-[color:var(--surface-elevated)]/90 backdrop-blur-xl">
        <Container className="flex min-h-16 flex-wrap items-center justify-between gap-2 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/admin" className="truncate text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
              Admin · Schnell Sicher Umzug
            </Link>
            <Link href="/" className="shrink-0 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              Zur Website
            </Link>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="outline-light" size="sm">
              Abmelden
            </Button>
          </form>
        </Container>
      </header>

      <Container className="grid gap-6 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="surface-glass h-fit rounded-2xl border p-3">
          <AdminNav newOrderCount={newOrderCount} />
        </aside>
        <main>{children}</main>
      </Container>
    </div>
  );
}
