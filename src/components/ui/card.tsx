import * as React from "react";

import { cn } from "@/components/ui/cn";

type CardVariant = "default" | "emphasis" | "subtle" | "glass";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
  variant?: CardVariant;
};

const variantClasses: Record<CardVariant, string> = {
  default:
    "bg-[rgba(255,255,255,0.72)] border border-[rgba(255,255,255,0.60)] shadow-[0_0_0_0.5px_rgba(10,16,32,0.04),0_4px_14px_rgba(10,16,32,0.05),inset_0_1px_0_rgba(255,255,255,0.70)] backdrop-blur-md dark:bg-slate-900/80 dark:border-slate-800 dark:backdrop-blur-none dark:shadow-sm",
  emphasis:
    "bg-[rgba(255,255,255,0.80)] border border-[rgba(255,255,255,0.70)] shadow-[0_0_0_0.5px_rgba(10,16,32,0.05),0_8px_24px_rgba(10,16,32,0.06),inset_0_1px_0_rgba(255,255,255,0.80)] backdrop-blur-lg dark:bg-slate-900 dark:border-slate-700 dark:backdrop-blur-none dark:shadow-md",
  subtle:
    "bg-[rgba(255,255,255,0.45)] border border-[rgba(255,255,255,0.45)] shadow-[0_0_0_0.5px_rgba(10,16,32,0.03),inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-sm dark:bg-slate-900/50 dark:border-slate-800/60 dark:backdrop-blur-none",
  glass:
    "bg-[rgba(255,255,255,0.55)] border border-[rgba(255,255,255,0.55)] shadow-[0_0_0_0.5px_rgba(10,16,32,0.04),0_4px_12px_rgba(10,16,32,0.04),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-lg dark:bg-slate-900/70 dark:border-slate-700/50 dark:backdrop-blur-none dark:shadow-sm",
};

export function Card({ className, hover = true, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-6",
        variantClasses[variant],
        hover &&
          "transition-all duration-220 ease-premium hover:-translate-y-0.5 hover:shadow-[0_0_0_0.5px_rgba(10,16,32,0.05),0_8px_24px_rgba(10,16,32,0.07),inset_0_1px_0_rgba(255,255,255,0.80)] hover:border-[rgba(255,255,255,0.75)] dark:hover:border-brand-500/30 dark:hover:shadow-[0_8px_24px_rgba(59,130,246,0.08)]",
        className,
      )}
      {...props}
    />
  );
}
