"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Zu ${nextTheme === "dark" ? "Dunkelmodus" : "Hellmodus"} wechseln`}
      title={nextTheme === "dark" ? "Dunkelmodus aktivieren" : "Hellmodus aktivieren"}
      className="group relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300/80 bg-white/70 backdrop-blur-sm transition-all duration-300 hover:border-brand-300 hover:shadow-[0_0_16px_rgba(59,130,246,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-brand-500/50 dark:hover:shadow-[0_0_20px_rgba(59,130,246,0.24)]"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 text-amber-500 transition-all duration-500 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 text-brand-400 transition-all duration-500 dark:rotate-0 dark:scale-100" />
    </button>
  );
}
