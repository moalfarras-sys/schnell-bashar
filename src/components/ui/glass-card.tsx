import * as React from "react";

import { cn } from "@/components/ui/cn";

type GlassCardVariant = "default" | "strong" | "solid" | "soft";

type GlassCardProps = React.HTMLAttributes<HTMLDivElement> & {
  blur?: "sm" | "md" | "lg";
  elevated?: boolean;
  interactive?: boolean;
  variant?: GlassCardVariant;
};

const blurClasses = {
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
} as const;

const variantClasses: Record<GlassCardVariant, string> = {
  default:
    "bg-[rgba(255,255,255,0.55)] border border-[rgba(255,255,255,0.55)] shadow-[0_0_0_0.5px_rgba(10,16,32,0.04),0_4px_12px_rgba(10,16,32,0.04),inset_0_1px_0_rgba(255,255,255,0.65)] dark:bg-slate-900/70 dark:border-slate-700/50 dark:shadow-sm",
  strong:
    "bg-[rgba(255,255,255,0.72)] border border-[rgba(255,255,255,0.65)] shadow-[0_0_0_0.5px_rgba(10,16,32,0.05),0_8px_20px_rgba(10,16,32,0.06),inset_0_1px_0_rgba(255,255,255,0.75)] dark:bg-slate-900/90 dark:border-slate-700/60 dark:shadow-md",
  solid:
    "bg-[rgba(255,255,255,0.88)] border border-[rgba(255,255,255,0.70)] shadow-[0_0_0_0.5px_rgba(10,16,32,0.05),0_6px_18px_rgba(10,16,32,0.05),inset_0_1px_0_rgba(255,255,255,0.80)] dark:bg-slate-900 dark:border-slate-800 dark:shadow-md",
  soft:
    "bg-[rgba(255,255,255,0.40)] border border-[rgba(255,255,255,0.40)] shadow-[0_0_0_0.5px_rgba(10,16,32,0.03),inset_0_1px_0_rgba(255,255,255,0.50)] dark:bg-slate-900/40 dark:border-slate-800/40",
};

export function GlassCard({
  className,
  blur = "md",
  elevated = true,
  interactive = false,
  variant = "default",
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        variantClasses[variant],
        blurClasses[blur],
        elevated && "shadow-sm",
        interactive &&
          "transition-all duration-220 ease-premium hover:-translate-y-0.5 hover:shadow-[0_0_0_0.5px_rgba(10,16,32,0.05),0_8px_24px_rgba(10,16,32,0.07),inset_0_1px_0_rgba(255,255,255,0.80)] hover:border-[rgba(255,255,255,0.75)] dark:hover:border-brand-500/30 dark:hover:shadow-md",
        className,
      )}
      {...props}
    />
  );
}
