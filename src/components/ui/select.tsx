import * as React from "react";

import { cn } from "@/components/ui/cn";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "h-11 w-full cursor-pointer rounded-xl border border-[rgba(255,255,255,0.60)] bg-[rgba(255,255,255,0.72)] px-4 text-sm font-medium text-slate-900 shadow-[0_0_0_0.5px_rgba(10,16,32,0.04),0_1px_3px_rgba(10,16,32,0.03),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-sm transition-all duration-200 ease-premium hover:bg-[rgba(255,255,255,0.82)] hover:border-[rgba(255,255,255,0.75)] focus:bg-[rgba(255,255,255,0.92)] focus:border-[rgba(47,140,255,0.35)] focus:outline-none focus:shadow-[0_0_0_4px_rgba(47,140,255,0.12),0_2px_8px_rgba(10,16,32,0.04),inset_0_1px_0_rgba(255,255,255,0.80)] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-brand-400 dark:focus:ring-brand-400/20 dark:backdrop-blur-none dark:shadow-sm",
        className,
      )}
      {...props}
    />
  );
});
Select.displayName = "Select";
