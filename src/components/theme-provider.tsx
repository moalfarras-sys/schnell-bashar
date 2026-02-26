"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type ThemeSetting = Theme | "system";

interface ThemeContextType {
  theme: Theme;
  setting: ThemeSetting;
  toggleTheme: () => void;
  setTheme: (value: ThemeSetting) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const STORAGE_KEY = "ssu-theme-setting";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [setting, setSetting] = useState<ThemeSetting>(() => {
    if (typeof window === "undefined") return "system";
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
    return "system";
  });
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const computeTheme = () => {
      return setting === "system" ? (media.matches ? "dark" : "light") : setting;
    };

    const apply = () => {
      const next = computeTheme();
      setThemeState(next);

      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(next);
      root.setAttribute("data-theme", next);
      root.style.colorScheme = next;
    };

    apply();
    const onChange = () => apply();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [setting]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, setting);
  }, [setting]);

  useEffect(() => {
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      root.setAttribute("data-motion", reduced.matches ? "reduced" : "full");
    };
    apply();
    const onChange = () => apply();
    reduced.addEventListener("change", onChange);
    return () => reduced.removeEventListener("change", onChange);
  }, []);

  const toggleTheme = () => {
    setSetting((prev) => {
      const active = prev === "system" ? theme : prev;
      return active === "dark" ? "light" : "dark";
    });
  };

  const setTheme = (value: ThemeSetting) => {
    setSetting(value);
  };

  return (
    <ThemeContext.Provider value={{ theme, setting, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
