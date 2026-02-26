import { Check } from "lucide-react";

import { cn } from "@/components/ui/cn";

export function WizardStepRail(props: {
  steps: ReadonlyArray<{ key: string; title: string }>;
  step: number;
}) {
  const pct = Math.round(((props.step + 1) / props.steps.length) * 100);

  return (
    <div className="booking-glass-card booking-motion-reveal rounded-3xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--booking-text-muted)]">
            Schritt {props.step + 1} von {props.steps.length}
          </div>
          <div className="mt-1 text-2xl font-black text-[color:var(--booking-text-strong)] sm:text-3xl">
            {props.steps[props.step]?.title}
          </div>
        </div>
        <div className="booking-glass-card-active flex h-14 w-14 items-center justify-center rounded-2xl text-sm font-black">
          {pct}%
        </div>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-brand-500 to-indigo-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {props.steps.map((s, idx) => (
          <div
            key={s.key}
            className={cn(
              "booking-step-pill",
              idx === props.step && "booking-step-pill-active",
              idx < props.step && "booking-step-pill-done",
            )}
          >
            {idx < props.step ? <Check className="h-3 w-3" /> : null}
            <span>{s.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
