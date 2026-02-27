"use client";

import { Check, ChevronRight } from "lucide-react";

import { cn } from "@/components/ui/cn";

export const bookingSteps = [
  "Service",
  "Adresse",
  "Volumen",
  "Extras",
  "Kontakt",
] as const;

export function StepNavigation(props: {
  current: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {bookingSteps.map((step, idx) => (
        <button
          key={step}
          type="button"
          onClick={() => props.onChange(idx)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition",
            idx === props.current
              ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-700 dark:text-cyan-200"
              : idx < props.current
                ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                : "border-slate-300/70 bg-white/50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/45 dark:text-slate-300",
          )}
        >
          {idx < props.current ? <Check className="h-3.5 w-3.5" /> : <span>{idx + 1}</span>}
          <span>{step}</span>
          {idx < bookingSteps.length - 1 ? <ChevronRight className="h-3 w-3 opacity-60" /> : null}
        </button>
      ))}
    </div>
  );
}

