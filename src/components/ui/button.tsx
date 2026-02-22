import * as React from "react";

import { cn } from "@/components/ui/cn";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "outline-light";
type ButtonSize = "sm" | "md" | "lg" | "xl";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-(image:--btn-gradient-primary) text-white border border-white/20 shadow-[var(--btn-shadow),inset_0_1px_0_rgba(255,255,255,0.25)] hover:bg-(image:--btn-gradient-primary-hover) hover:shadow-[var(--btn-shadow-hover),inset_0_1px_0_rgba(255,255,255,0.30)] hover:-translate-y-px active:translate-y-0 active:shadow-[var(--btn-shadow-active),inset_0_1px_0_rgba(255,255,255,0.20)] focus-visible:ring-brand-500/30 dark:border-brand-400/30",
  secondary:
    "bg-(image:--btn-gradient-secondary) text-white border border-white/10 shadow-[0_4px_14px_rgba(10,16,32,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] hover:shadow-[0_8px_24px_rgba(10,16,32,0.16),inset_0_1px_0_rgba(255,255,255,0.16)] hover:-translate-y-px active:translate-y-0 focus-visible:ring-slate-600 dark:border-slate-600/40",
  outline:
    "border border-[rgba(255,255,255,0.60)] bg-[rgba(255,255,255,0.55)] text-slate-900 shadow-[0_0_0_0.5px_rgba(10,16,32,0.04),0_2px_8px_rgba(10,16,32,0.04),inset_0_1px_0_rgba(255,255,255,0.70)] backdrop-blur-md hover:bg-[rgba(255,255,255,0.75)] hover:shadow-[0_0_0_0.5px_rgba(10,16,32,0.05),0_4px_14px_rgba(10,16,32,0.06),inset_0_1px_0_rgba(255,255,255,0.80)] hover:-translate-y-px focus-visible:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-brand-500/50 dark:hover:bg-slate-800/90 dark:hover:shadow-[0_0_24px_rgba(59,130,246,0.12)] dark:backdrop-blur-none",
  "outline-light":
    "border border-white/30 bg-white/12 text-white backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] hover:bg-white/22 hover:border-white/50 hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.35)] active:translate-y-0 focus-visible:ring-white/25",
  ghost:
    "bg-transparent text-slate-900 hover:bg-[rgba(255,255,255,0.55)] hover:shadow-[0_0_0_0.5px_rgba(10,16,32,0.04),inset_0_1px_0_rgba(255,255,255,0.60)] focus-visible:ring-slate-400 dark:text-slate-100 dark:hover:bg-slate-800/60 dark:hover:shadow-none",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-6 text-base",
  xl: "h-14 px-8 text-base sm:text-lg",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => {
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
Button.displayName = "Button";
