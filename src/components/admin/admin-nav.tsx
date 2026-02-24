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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  section?: string;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Aufträge", icon: ClipboardList },
  { href: "/admin/offers", label: "Angebote & Verträge", icon: FileText },
  { href: "/admin/offers/new", label: "Neues Angebot", icon: PlusCircle },
  { href: "/admin/contracts/manual", label: "Neuer Vertrag (manuell)", icon: PlusCircle },
  { href: "/admin/catalog", label: "Katalog", icon: Package },
  { href: "/admin/pricing", label: "Preise", icon: Tag },
  { href: "/admin/availability", label: "Zeitfenster", icon: Calendar },
  { href: "/admin/media", label: "Mediathek", icon: ImageIcon },
  { href: "/admin/media/slots", label: "Image Slots", icon: LayoutTemplate },
  { href: "/admin/content", label: "Inhalte", icon: Type },
  { href: "/admin/jobs", label: "Stellenangebote", icon: Briefcase },
  { href: "/admin/users", label: "Benutzer", icon: Users },
  { href: "/admin/roles", label: "Rollen & Rechte", icon: Shield },
  { href: "/admin/audit", label: "Audit-Log", icon: ScrollText },
  { href: "/admin/accounting", label: "Buchhaltung", icon: Wallet, section: "accounting" },
  { href: "/admin/accounting/invoices", label: "Rechnungen", icon: Receipt, section: "accounting" },
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

  const mainItems = items.filter((n) => !n.section);
  const accountingItems = items.filter((n) => n.section === "accounting");

  function renderItem(n: (typeof items)[number]) {
    const active = isActive(n.href);
    const Icon = n.icon;
    return (
      <Link
        key={n.href}
        href={n.href}
        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
          active
            ? "bg-brand-600/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
        }`}
      >
        <Icon
          className={`h-4 w-4 shrink-0 ${active ? "text-brand-400" : "text-slate-500 group-hover:text-slate-300"}`}
        />
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
    <nav className="grid gap-0.5">
      {mainItems.map(renderItem)}
      {accountingItems.length > 0 && (
        <>
          <div className="my-2 border-t border-slate-700/50" />
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Buchhaltung
          </div>
          {accountingItems.map(renderItem)}
        </>
      )}
    </nav>
  );
}
