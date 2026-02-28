import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Menu, Sparkles } from "lucide-react";

import { logoutAction } from "@/app/admin/actions";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminPwaRegister } from "@/components/admin/admin-pwa-register";
import { ThemeToggle } from "@/components/theme-toggle";
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
    <div className="admin-shell luxury-bg min-h-screen text-slate-900 dark:text-slate-100">
      <AdminPwaRegister />

      <header className="sticky top-0 z-50 border-b border-[color:var(--line-soft)] bg-[color:var(--surface-elevated)]/90 backdrop-blur-xl">
        <Container className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1.5 text-sm font-extrabold tracking-tight text-slate-900 ring-1 ring-brand-400/35 dark:bg-brand-400/15 dark:text-white"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              SSU Admin
            </Link>
            <Link href="/" className="shrink-0 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              Zur Website
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-full border border-brand-300/60 bg-brand-100/80 px-1.5 py-1 shadow-[0_8px_24px_rgba(14,165,233,0.18)] dark:border-brand-500/40 dark:bg-brand-900/30">
              <ThemeToggle />
            </div>
            <Link href="/admin/orders">
              <Button type="button" variant="outline-light" size="sm">
                Aufträge
              </Button>
            </Link>
            <form action={logoutAction}>
              <Button type="submit" variant="outline-light" size="sm">
                Abmelden
              </Button>
            </form>
          </div>
        </Container>
      </header>

      <Container className="grid gap-4 py-4 lg:grid-cols-[300px_1fr] lg:gap-6 lg:py-8">
        <details className="admin-mobile-nav surface-glass rounded-2xl border p-3 lg:hidden">
          <summary className="admin-mobile-menu-trigger cursor-pointer list-none">
            <span className="admin-mobile-menu-trigger__icon" aria-hidden="true">
              <Menu className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black tracking-tight text-slate-900 dark:text-white">Admin-Menü</span>
              <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Navigation, Buchhaltung und Einstellungen</span>
            </span>
            <span className="admin-mobile-menu-trigger__chip">
              <Sparkles className="h-3.5 w-3.5" />
              Öffnen
            </span>
          </summary>
          <div className="admin-mobile-nav-panel mt-3 border-t border-[color:var(--line-soft)] pt-3">
            <div className="mb-3 rounded-2xl bg-slate-100/75 p-3 text-xs font-semibold text-slate-700 dark:bg-slate-900/45 dark:text-slate-300">
              Verwaltung, Buchhaltung und Inhalte in einer Übersicht.
            </div>
            <AdminNav newOrderCount={newOrderCount} />
            <form action={logoutAction} className="mt-3">
              <Button type="submit" variant="outline-light" size="sm" className="w-full">
                Abmelden
              </Button>
            </form>
          </div>
        </details>

        <aside className="hidden h-fit rounded-3xl border p-4 lg:sticky lg:top-24 lg:block lg:bg-[color:var(--surface-glass)] lg:backdrop-blur-xl">
          <div className="mb-3 rounded-2xl bg-slate-100/75 p-3 text-xs font-semibold text-slate-700 dark:bg-slate-900/45 dark:text-slate-300">
            Verwaltung, Buchhaltung und Inhalte in einer Übersicht.
          </div>
          <AdminNav newOrderCount={newOrderCount} />
        </aside>

        <main className="admin-main min-w-0 rounded-3xl border border-[color:var(--line-soft)] bg-white/35 p-3 backdrop-blur-sm dark:bg-slate-900/20 lg:p-4">
          {children}
        </main>
      </Container>
    </div>
  );
}
