import { Check } from "lucide-react";

import { cn } from "@/components/ui/cn";

export function WizardStepRail(props: {
  steps: ReadonlyArray<{ key: string; title: string }>;
  step: number;
}) {
  const pct = Math.round(((props.step + 1) / props.steps.length) * 100);

  return (
    <div className="booking-glass-card booking-motion-reveal booking-step-rail rounded-3xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-cyan-300/90">
            Schritt {props.step + 1} von {props.steps.length}
          </div>
          <div className="mt-1 text-2xl font-black text-[color:var(--booking-text-strong)] sm:text-[2.15rem]">
            {props.steps[props.step]?.title}
          </div>
          <div className="mt-1 text-xs font-semibold text-[color:var(--booking-text-muted)] sm:text-sm">
            Schrittweise Eingabe mit Live-Validierung und direktem Preis-Feedback.
          </div>
        </div>
        <div className="booking-glass-card-active booking-glow-badge flex h-16 w-16 items-center justify-center rounded-2xl text-base font-black">
          {pct}%
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800/75">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
        {props.steps.map((s, idx) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={cn(
                "booking-step-dot",
                idx === props.step && "booking-step-dot-active",
                idx < props.step && "booking-step-dot-done",
              )}
            >
              {idx < props.step ? <Check className="h-3 w-3" /> : <span>{idx + 1}</span>}
            </div>
            <div
              className={cn(
                "booking-step-pill",
                idx === props.step && "booking-step-pill-active",
                idx < props.step && "booking-step-pill-done",
              )}
            >
              <span>{s.title}</span>
            </div>
            {idx < props.steps.length - 1 ? <div className="booking-step-connector" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
