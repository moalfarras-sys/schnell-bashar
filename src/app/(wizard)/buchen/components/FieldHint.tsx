import { CircleAlert, CircleCheck, CircleX } from "lucide-react";

import { cn } from "@/components/ui/cn";

type FieldHintTone = "info" | "success" | "warning" | "error";

export function FieldHint(props: { tone?: FieldHintTone; text: string; className?: string }) {
  const tone = props.tone ?? "info";
  const Icon = tone === "error" ? CircleX : tone === "success" ? CircleCheck : CircleAlert;

  return (
    <div
      className={cn(
        "booking-glass-card flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-semibold",
        tone === "error" && "booking-error-inline",
        tone === "warning" && "border-amber-300/70 text-amber-900 dark:text-amber-200",
        tone === "success" && "border-emerald-300/70 text-emerald-900 dark:text-emerald-200",
        tone === "info" && "border-slate-300/70 text-[color:var(--booking-text-muted)]",
        props.className,
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{props.text}</span>
    </div>
  );
}
