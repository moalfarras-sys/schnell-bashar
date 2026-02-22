"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { MegaMenuDesktop, MegaMenuMobile } from "@/components/layout/mega-menu";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader({ logoSrc = "/media/brand/hero-logo.jpeg" }: { logoSrc?: string }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeMobile = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`glass-navbar sticky top-0 z-50 transition-all duration-300 ease-premium ${
        scrolled
          ? "border-b border-[rgba(143,196,255,0.60)] bg-[rgba(232,243,255,0.84)] shadow-[0_0_0_0.5px_rgba(15,42,69,0.10),0_8px_24px_rgba(15,42,69,0.14),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/90 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
          : "border-b border-[rgba(183,217,255,0.56)] bg-[rgba(243,249,255,0.70)] shadow-[0_0_0_0.5px_rgba(15,42,69,0.08),0_2px_8px_rgba(15,42,69,0.10),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-lg dark:border-transparent dark:bg-slate-950/60"
      }`}
    >
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="group flex items-center gap-2.5 font-extrabold tracking-tight">
          <div className="relative">
            <Image
              src={logoSrc}
              alt="Schnell Sicher Umzug"
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl object-cover shadow-sm ring-1 ring-brand-200/70 transition-all duration-300 group-hover:shadow-md group-hover:ring-brand-300/70 dark:ring-slate-700/50 dark:group-hover:ring-brand-500/40"
            />
          </div>
          <span className="hidden leading-tight sm:block dark:text-white">
            Schnell&nbsp;Sicher&nbsp;<span className="bg-linear-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent dark:from-brand-400 dark:to-brand-300">Umzug</span>
          </span>
        </Link>

        <MegaMenuDesktop />

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          <Link
            href="/anfrage"
            className="cursor-pointer rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-[rgba(232,243,255,0.85)] hover:text-brand-700 hover:shadow-[0_0_0_0.5px_rgba(15,42,69,0.10),0_2px_6px_rgba(15,42,69,0.10),inset_0_1px_0_rgba(255,255,255,0.65)] focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:hover:shadow-none"
          >
            Anfrage verfolgen
          </Link>
          <Link href="/preise">
            <Button size="sm">Angebot berechnen</Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-[rgba(183,217,255,0.62)] bg-[rgba(232,243,255,0.74)] shadow-[0_0_0_0.5px_rgba(15,42,69,0.08),0_2px_8px_rgba(15,42,69,0.10),inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-md transition-all duration-200 hover:bg-[rgba(243,249,255,0.92)] hover:shadow-[0_0_0_0.5px_rgba(15,42,69,0.12),0_4px_12px_rgba(15,42,69,0.14),inset_0_1px_0_rgba(255,255,255,0.85)] active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:backdrop-blur-none"
            aria-label={open ? "Menue schliessen" : "Menue oeffnen"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </Container>

      {open && (
        <div className="border-t border-[rgba(183,217,255,0.55)] bg-[rgba(232,243,255,0.86)] backdrop-blur-xl lg:hidden dark:border-slate-800 dark:bg-slate-950/95">
          <Container className="py-4">
            <MegaMenuMobile onClose={closeMobile} />
            <div className="mt-3 border-t border-[rgba(10,16,32,0.06)] pt-3 dark:border-slate-800">
              <Link
                href="/anfrage"
                className="block cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-brand-100 focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={closeMobile}
              >
                Anfrage verfolgen
              </Link>
              <Link href="/preise" onClick={closeMobile}>
                <Button className="mt-2 w-full">Angebot berechnen</Button>
              </Link>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
