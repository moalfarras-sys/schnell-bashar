"use client";

import * as React from "react";
import { cn } from "@/components/ui/cn";

type RippleButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function RippleButton({ className, children, ...props }: RippleButtonProps) {
  const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([]);

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples((prev) => [...prev, { x, y, id }]);
    props.onClick?.(e);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 550);
  }

  return (
    <button
      {...props}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-xl border border-slate-200 bg-[color:var(--surface-elevated)] px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600",
        className,
      )}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute h-20 w-20 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-brand-500/20"
          style={{ left: r.x, top: r.y }}
        />
      ))}
      <span className="relative z-10">{children}</span>
    </button>
  );
}
