import * as React from "react";

import { cn } from "@/components/ui/cn";

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "h-5 w-5 rounded border border-slate-300 text-brand-600 shadow-sm transition-all duration-200 hover:border-brand-400 focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-0 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-brand-500/50",
        className,
      )}
      {...props}
    />
  );
});
Checkbox.displayName = "Checkbox";
