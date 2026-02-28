"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Tag,
  Package,
  Calendar,
  ImageIcon,
  LayoutTemplate,
  Briefcase,
  Type,
  Receipt,
  BarChart3,
  Wallet,
  PlusCircle,
  Shield,
  Users,
  ScrollText,
  Wrench,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  section?: "main" | "operations" | "content" | "system" | "accounting";
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Übersicht", icon: LayoutDashboard, section: "main" },
  { href: "/admin/orders", label: "Aufträge", icon: ClipboardList, section: "main" },
  { href: "/admin/offers", label: "Angebote & Verträge", icon: FileText, section: "main" },
  { href: "/admin/offers/new", label: "Neues Angebot", icon: PlusCircle, section: "operations" },
  { href: "/admin/contracts/manual", label: "Neuer Vertrag (manuell)", icon: PlusCircle, section: "operations" },
  { href: "/admin/catalog", label: "Katalog", icon: Package, section: "operations" },
  { href: "/admin/services", label: "Services & Promo-Regeln", icon: Wrench, section: "operations" },
  { href: "/admin/pricing", label: "Preise", icon: Tag, section: "operations" },
  { href: "/admin/availability", label: "Zeitfenster", icon: Calendar, section: "operations" },
  { href: "/admin/calendar", label: "Abholkalender", icon: Calendar, section: "operations" },
  { href: "/admin/media", label: "Mediathek", icon: ImageIcon, section: "content" },
  { href: "/admin/media/slots", label: "Bild-Slots", icon: LayoutTemplate, section: "content" },
  { href: "/admin/content", label: "Inhalte", icon: Type, section: "content" },
  { href: "/admin/jobs", label: "Stellenangebote", icon: Briefcase, section: "content" },
  { href: "/admin/users", label: "Benutzer", icon: Users, section: "system" },
  { href: "/admin/roles", label: "Rollen & Rechte", icon: Shield, section: "system" },
  { href: "/admin/audit", label: "Audit-Log", icon: ScrollText, section: "system" },
  { href: "/admin/settings", label: "Einstellungen", icon: Settings, section: "system" },
  { href: "/admin/accounting", label: "Buchhaltung", icon: Wallet, section: "accounting" },
  { href: "/admin/accounting/invoices", label: "Rechnungen", icon: Receipt, section: "accounting" },
  { href: "/admin/accounting/invoices/new", label: "Neue Rechnung (manuell)", icon: PlusCircle, section: "accounting" },
  { href: "/admin/accounting/expenses", label: "Ausgaben", icon: Wallet, section: "accounting" },
  { href: "/admin/accounting/expense-categories", label: "Ausgabenkategorien", icon: Settings, section: "accounting" },
  { href: "/admin/accounting/quarterly-report", label: "Quartalsbericht", icon: BarChart3, section: "accounting" },
  { href: "/admin/accounting/reports", label: "Berichte", icon: BarChart3, section: "accounting" },
];

export function AdminNav({ newOrderCount }: { newOrderCount?: number }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  const items = navItems.map((item) => ({
    ...item,
    badge: item.href === "/admin/orders" ? newOrderCount : undefined,
  }));

  const sectionMeta: Record<NonNullable<NavItem["section"]>, string> = {
    main: "Kernbereich",
    operations: "Betrieb",
    content: "Inhalte",
    system: "System",
    accounting: "Buchhaltung",
  };

  function renderItem(n: (typeof items)[number]) {
    const active = isActive(n.href);
    const Icon = n.icon;
    return (
      <Link
        key={n.href}
        href={n.href}
        className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
          active
            ? "bg-brand-500/20 text-brand-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] ring-1 ring-brand-400/45 dark:text-brand-100 dark:bg-brand-500/25"
            : "text-slate-700 hover:bg-white/65 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
        }`}
      >
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${
          active
            ? "bg-brand-500/20 text-brand-700 dark:bg-brand-400/20 dark:text-brand-200"
            : "bg-slate-200/80 text-slate-600 group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700 dark:group-hover:text-slate-200"
        }`}>
          <Icon className="h-4 w-4 shrink-0" />
        </span>
        <span className="truncate">{n.label}</span>
        {n.badge != null && n.badge > 0 && (
          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
            {n.badge > 99 ? "99+" : n.badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <nav className="grid gap-3">
      {(Object.keys(sectionMeta) as Array<NonNullable<NavItem["section"]>>).map((sectionKey) => {
        const sectionItems = items.filter((n) => n.section === sectionKey);
        if (sectionItems.length === 0) return null;
        return (
          <div key={sectionKey} className="grid gap-1.5">
            <div className="px-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {sectionMeta[sectionKey]}
            </div>
            {sectionItems.map(renderItem)}
          </div>
        );
      })}
    </nav>
  );
}
