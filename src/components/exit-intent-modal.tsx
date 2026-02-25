"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift, X } from "lucide-react";

export function ExitIntentModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("ssu_exit_intent_seen")) return;

    function onMouseOut(e: MouseEvent) {
      if (e.clientY <= 8) {
        setOpen(true);
        sessionStorage.setItem("ssu_exit_intent_seen", "1");
      }
    }

    document.addEventListener("mouseout", onMouseOut);
    return () => document.removeEventListener("mouseout", onMouseOut);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="relative max-w-md rounded-2xl border border-slate-200 bg-[color:var(--surface-elevated)] p-8 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <button
          className="absolute right-4 top-4 rounded-lg border border-slate-200 p-1.5 text-slate-400 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600 dark:border-slate-700 dark:text-slate-500 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          onClick={() => setOpen(false)}
          aria-label="Schließen"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br from-brand-100 to-brand-50 shadow-sm dark:from-brand-950/60 dark:to-brand-900/40">
          <Gift className="h-7 w-7 text-brand-600 dark:text-brand-400" />
        </div>

        <h3 className="mt-5 text-xl font-extrabold">Kurz vor dem Gehen?</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Holen Sie sich jetzt Ihr <span className="font-bold text-brand-600 dark:text-brand-400">kostenloses Angebot</span> in
          weniger als 2 Minuten — unverbindlich und transparent.
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Link
            href="/preise"
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-(image:--btn-gradient-primary) px-5 py-3 text-sm font-bold text-white shadow-(--btn-shadow) transition-all duration-300 hover:shadow-(--btn-shadow-hover) hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => setOpen(false)}
          >
            Kostenloses Angebot erhalten
          </Link>
          <button
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-[color:var(--surface-elevated)] px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all duration-300 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-white"
            onClick={() => setOpen(false)}
          >
            Später
          </button>
        </div>
      </div>
    </div>
  );
}

