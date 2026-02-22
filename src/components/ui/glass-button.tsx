import * as React from "react";

import { cn } from "@/components/ui/cn";

type GlassButtonVariant = "primary-glass" | "outline-glass" | "ghost-glass" | "solid-glass";
type GlassButtonSize = "sm" | "md" | "lg" | "xl";

const variantClasses: Record<GlassButtonVariant, string> = {
  "primary-glass":
    "bg-[rgba(47,140,255,0.10)] border border-[rgba(47,140,255,0.22)] text-brand-700 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.50)] hover:bg-[rgba(47,140,255,0.18)] hover:border-[rgba(47,140,255,0.35)] hover:shadow-[0_0_20px_rgba(47,140,255,0.12),inset_0_1px_0_rgba(255,255,255,0.55)] hover:-translate-y-px active:translate-y-0 focus-visible:ring-brand-500/30 dark:text-brand-300 dark:bg-brand-500/12 dark:border-brand-400/25 dark:hover:bg-brand-500/20 dark:hover:shadow-[0_0_28px_rgba(59,130,246,0.25)] dark:backdrop-blur-none",
  "outline-glass":
    "border border-[rgba(255,255,255,0.60)] bg-[rgba(255,255,255,0.55)] text-slate-900 shadow-[0_0_0_0.5px_rgba(10,16,32,0.04),0_2px_8px_rgba(10,16,32,0.04),inset_0_1px_0_rgba(255,255,255,0.70)] backdrop-blur-md hover:bg-[rgba(255,255,255,0.75)] hover:shadow-[0_0_0_0.5px_rgba(10,16,32,0.05),0_4px_14px_rgba(10,16,32,0.06),inset_0_1px_0_rgba(255,255,255,0.80)] hover:-translate-y-px focus-visible:ring-slate-500/20 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800/90 dark:backdrop-blur-none",
  "ghost-glass":
    "bg-transparent text-slate-900 hover:bg-[rgba(255,255,255,0.55)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.60)] focus-visible:ring-slate-400 dark:text-slate-100 dark:hover:bg-slate-800/60 dark:hover:shadow-none",
  "solid-glass":
    "border border-[rgba(255,255,255,0.60)] bg-[rgba(255,255,255,0.70)] text-slate-900 shadow-[0_0_0_0.5px_rgba(10,16,32,0.04),0_2px_8px_rgba(10,16,32,0.04),inset_0_1px_0_rgba(255,255,255,0.72)] hover:bg-[rgba(255,255,255,0.85)] hover:shadow-[0_0_0_0.5px_rgba(10,16,32,0.05),0_4px_12px_rgba(10,16,32,0.06),inset_0_1px_0_rgba(255,255,255,0.82)] hover:-translate-y-px focus-visible:ring-slate-500/20 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800/90",
};

const sizeClasses: Record<GlassButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-6 text-base",
  xl: "h-14 px-7 text-base sm:text-lg",
};

export type GlassButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: GlassButtonVariant;
  size?: GlassButtonSize;
};

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    { className, variant = "primary-glass", size = "md", type = "button", ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-all duration-220 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
GlassButton.displayName = "GlassButton";
