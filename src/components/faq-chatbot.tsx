"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquare, Search, X, Send } from "lucide-react";

import { searchFaq } from "@/lib/faq-search";
import { Input } from "@/components/ui/input";

export function FaqChatbot({ embedded }: { embedded?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchFaq(query), [query]);

  return (
    <div
      className={
        embedded
          ? "w-[min(92vw,360px)]"
          : "fixed bottom-20 right-5 z-40 w-[min(92vw,360px)]"
      }
    >
      {open ? (
        <div className="rounded-3xl border-2 border-slate-200 bg-[color:var(--surface-elevated)] p-5 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-br from-brand-600 to-brand-700 shadow-sm">
                <Search className="h-4 w-4 text-white" />
              </div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">FAQ Assistent</div>
            </div>
            <button
              className="rounded-xl border border-slate-200 p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              onClick={() => setOpen(false)}
              aria-label="Schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-400">
            Stellen Sie eine kurze Frage. Wir durchsuchen die lokale FAQ-Datenbank.
          </div>
          <div className="mt-3 relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="z. B. Was kostet ein Umzug?"
              className="pr-10"
            />
            <Send className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>
          <div className="mt-3 grid max-h-60 gap-2 overflow-y-auto">
            {results.length > 0 ? (
              results.map((item) => (
                <div key={item.id} className="rounded-2xl border-2 border-slate-200 bg-[color:var(--surface-elevated)] p-3 transition-all duration-200 hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-slate-600">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{item.question}</div>
                  <div className="mt-1.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">{item.answer}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border-2 border-slate-200 bg-[color:var(--surface-elevated)] p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                Keine passende Antwort.{" "}
                <Link href="/kontakt" className="font-extrabold text-brand-700 hover:underline dark:text-brand-400">
                  Kontakt öffnen
                </Link>
                .
              </div>
            )}
          </div>
        </div>
      ) : null}

      <button
        onClick={() => setOpen((v) => !v)}
        className="ml-auto mt-3 flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-slate-900/20 transition-all duration-300 hover:bg-slate-800 hover:shadow-xl hover:scale-105 active:scale-95 dark:bg-brand-600 dark:shadow-brand-900/30 dark:hover:bg-brand-500"
      >
        {open ? <Search className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
        FAQ Chat
      </button>
    </div>
  );
}
