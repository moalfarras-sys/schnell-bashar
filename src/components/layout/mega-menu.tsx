"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Truck,
  Recycle,
  Wrench,
  BadgeEuro,
  CalendarDays,
  ClipboardList,
  Search,
  HelpCircle,
  Mail,
  MessageCircle,
  Newspaper,
} from "lucide-react";
import { cn } from "@/components/ui/cn";

type MenuLink = {
  label: string;
  href: string;
  desc?: string;
  icon?: React.ComponentType<{ className?: string }>;
};
type MenuColumn = { title: string; links: MenuLink[] };
type MenuSection = {
  label: string;
  href?: string;
  columns?: MenuColumn[];
};

const menuSections: MenuSection[] = [
  {
    label: "Leistungen",
    columns: [
      {
        title: "Unsere Leistungen",
        links: [
          { label: "Umzug", href: "/umzug", desc: "Privat & Gewerbe", icon: Truck },
          { label: "Entsorgung", href: "/entsorgung", desc: "Sperrmüll & Entrümpelung", icon: Recycle },
          { label: "Montage", href: "/montage", desc: "Möbelaufbau & Abbau", icon: Wrench },
          { label: "Preise & Pakete", href: "/preise", desc: "Günstig / Standard / Express", icon: BadgeEuro },
          { label: "Abholkalender", href: "/kalender", desc: "PLZ & Zeitfenster", icon: CalendarDays },
        ],
      },
    ],
  },
  {
    label: "Buchung",
    columns: [
      {
        title: "Online buchen",
        links: [
          { label: "Angebot berechnen", href: "/preise", desc: "Richtpreis sofort erhalten", icon: BadgeEuro },
          { label: "Termin & Kalender", href: "/booking?context=MOVING", desc: "Zeitfenster wählen", icon: CalendarDays },
          { label: "Anfrage verfolgen", href: "/anfrage", desc: "Status prüfen", icon: Search },
        ],
      },
    ],
  },
  {
    label: "Info",
    columns: [
      {
        title: "Informationen",
        links: [
          { label: "Tracking", href: "/anfrage", desc: "Status Ihrer Anfrage", icon: Search },
          { label: "Tipps & Blog", href: "/tipps", desc: "Umzug & Entsorgung", icon: Newspaper },
          { label: "FAQ", href: "/faq", desc: "Häufige Fragen", icon: HelpCircle },
          { label: "Kontakt", href: "/kontakt", desc: "Nachricht senden", icon: Mail },
          { label: "WhatsApp", href: "https://wa.me/491729573681", desc: "Direkt chatten", icon: MessageCircle },
        ],
      },
    ],
  },
];

export function MegaMenuDesktop() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (openIdx === null) return;

    function onPointerDown(e: PointerEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenIdx(null);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openIdx]);

  useEffect(() => {
    if (openIdx === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIdx(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openIdx]);

  const toggle = useCallback((idx: number) => {
    setOpenIdx((prev) => (prev === idx ? null : idx));
  }, []);

  const close = useCallback(() => setOpenIdx(null), []);

  return (
    <nav ref={navRef} className="hidden items-center gap-0.5 lg:flex" aria-label="Hauptnavigation">
      {menuSections.map((section, idx) => (
        <div key={section.label} className="relative">
          <button
            type="button"
            onClick={() => toggle(idx)}
            aria-expanded={openIdx === idx}
            aria-haspopup="true"
            className={cn(
              "flex cursor-pointer select-none items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all duration-200",
              openIdx === idx
                ? "bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
                : "text-slate-700 hover:bg-[color:var(--surface-soft)] hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
            )}
          >
            {section.label}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                openIdx === idx && "rotate-180",
              )}
            />
          </button>

          {section.columns && openIdx === idx && (
            <div className="absolute left-1/2 top-full z-100 pt-2 -translate-x-1/2">
              <div className="w-72 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-elevated)] p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                {section.columns.map((col) => (
                  <div key={col.title}>
                    <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {col.title}
                    </div>
                    {col.links.map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.href + link.label}
                          href={link.href}
                          onClick={close}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-200 hover:bg-[color:var(--surface-soft)] dark:hover:bg-slate-800/60"
                        >
                          {Icon && (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-brand-100 to-brand-50 text-brand-600 dark:from-brand-950/60 dark:to-brand-900/40 dark:text-brand-400">
                              <Icon className="h-4 w-4" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">{link.label}</div>
                            {link.desc && (
                              <div className="text-xs text-slate-500 dark:text-slate-400">{link.desc}</div>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

export function MegaMenuMobile({ onClose }: { onClose: () => void }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="grid gap-1 py-2">
      <Link
        href="/"
        className="block rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
        onClick={onClose}
      >
        Startseite
      </Link>

      {menuSections.map((section, idx) => (
        <div key={section.label}>
          <button
            type="button"
            onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
            aria-expanded={openIdx === idx}
            className={cn(
              "flex w-full cursor-pointer items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-semibold transition-colors duration-200",
              openIdx === idx
                ? "bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
                : "text-slate-700 hover:bg-[color:var(--surface-soft)] dark:text-slate-200 dark:hover:bg-slate-800",
            )}
          >
            {section.label}
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                openIdx === idx && "rotate-90",
              )}
            />
          </button>

          {section.columns && openIdx === idx && (
            <div className="mt-1 grid gap-0.5 border-l border-[color:var(--line-soft)] pl-4 dark:border-slate-700">
              {section.columns.map((col) =>
                col.links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href + link.label}
                      href={link.href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-[color:var(--surface-soft)] hover:text-brand-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-brand-400"
                      onClick={onClose}
                    >
                      {Icon && <Icon className="h-4 w-4 text-brand-600 dark:text-brand-400" />}
                      {link.label}
                    </Link>
                  );
                }),
              )}
            </div>
          )}
        </div>
      ))}

    </div>
  );
}





