import { CheckCircle2, Circle, Clock3, Truck } from "lucide-react";

const steps = [
  { key: "NEW", label: "Neu eingegangen", icon: Circle },
  { key: "CONFIRMED", label: "Bestätigt", icon: CheckCircle2 },
  { key: "IN_PROGRESS", label: "In Bearbeitung", icon: Truck },
  { key: "DONE", label: "Abgeschlossen", icon: Clock3 },
];

function statusIndex(status: string) {
  const idx = steps.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export function OrderTimeline(props: {
  status: string;
  createdAt: string;
  slotLabel: string;
}) {
  const idx = statusIndex(props.status);
  return (
    <div className="mt-6 rounded-3xl border-2 border-slate-200 bg-[color:var(--surface-elevated)] p-5 shadow-md backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/60">
      <div className="text-sm font-extrabold text-slate-900 dark:text-white">Statusverlauf</div>
      <div className="mt-4 grid gap-3">
        {steps.map((step, i) => {
          const done = i <= idx;
          const Icon = step.icon;
          return (
            <div
              key={step.key}
              className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-2 transition-all duration-200 ${
                done
                  ? "border-brand-400 bg-brand-50 text-slate-900 dark:border-brand-500/40 dark:bg-brand-950/30 dark:text-white"
                  : "border-slate-200 bg-[color:var(--surface-elevated)] text-slate-700 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-400"
              }`}
            >
              <Icon className={`h-4 w-4 ${done ? "text-brand-700 dark:text-brand-400" : "text-slate-500 dark:text-slate-500"}`} />
              <span className="text-sm font-semibold">{step.label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 text-xs font-semibold text-slate-700 dark:text-slate-400">
        Erstellt: {props.createdAt} · Termin: {props.slotLabel}
      </div>
    </div>
  );
}

