"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const PAGE_LABELS: Record<string, string> = {
  "/umzug": "Umzug",
  "/entsorgung": "Entsorgung",
  "/preise": "Preise & Pakete",
  "/vergleich": "Paketvergleich",
  "/buchen": "Angebot berechnen",
  "/kalender": "Termin & Kalender",
  "/buchung/termin": "Termin & Kalender",
  "/buchung/bestaetigt": "Buchung bestätigt",
  "/umzugsplaner": "Umzugsplaner",
  "/meine-anfrage": "Anfrage verfolgen",
  "/anfrage": "Anfrage verfolgen",
  "/tracking": "Tracking",
  "/ueber-uns": "Über uns",
  "/galerie": "Galerie",
  "/faq": "FAQ",
  "/kontakt": "Kontakt",
  "/datenschutz": "Datenschutz",
  "/impressum": "Impressum",
  "/agb": "AGB",
};

export function PageBreadcrumb() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  const basePath = "/" + pathname.split("/")[1];
  const segments = pathname.split("/").filter(Boolean);
  const currentLabel =
    PAGE_LABELS[pathname] ??
    PAGE_LABELS[basePath] ??
    segments[segments.length - 1]?.replace(/-/g, " ")?.replace(/\b\w/g, (c) => c.toUpperCase()) ??
    "Seite";

  return (
    <nav
      aria-label="Breadcrumb"
      className="border-b border-[color:var(--line-soft)] bg-[color:var(--surface-glass)] py-2.5 backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-950/80"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-1.5 px-4 text-sm sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 font-medium text-slate-500 transition-colors hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
        >
          <Home className="h-3.5 w-3.5" />
          Startseite
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
        <span className="font-semibold text-slate-900 dark:text-white">{currentLabel}</span>
      </div>
    </nav>
  );
}
