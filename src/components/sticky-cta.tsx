"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Phone, MessageCircle, CalendarDays } from "lucide-react";

export function StickyCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > 300);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="border-t border-[color:var(--line-soft)] bg-[color:var(--surface-elevated)] shadow-[0_-4px_20px_rgba(41,37,36,0.11)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="container mx-auto px-4 py-3">
          <div className="grid grid-cols-3 gap-2">
            <a
              href="tel:+491729573681"
              className="flex flex-col items-center justify-center gap-1 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-elevated)] py-3 text-center shadow-sm transition-all duration-200 active:scale-95 dark:border-slate-700 dark:bg-slate-900"
            >
              <Phone className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Anrufen</span>
            </a>

            <a
              href="https://wa.me/491729573681"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 py-3 text-center shadow-sm transition-all duration-200 active:scale-95 dark:border-emerald-800/40 dark:bg-emerald-950/30"
            >
              <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">WhatsApp</span>
            </a>

            <Link
              href="/preise"
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-(image:--btn-gradient-primary) py-3 text-center text-white shadow-(--btn-shadow) transition-all duration-200 active:scale-95"
            >
              <CalendarDays className="h-5 w-5" />
              <span className="text-xs font-bold">Anfragen</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
