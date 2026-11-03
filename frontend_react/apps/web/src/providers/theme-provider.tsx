"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { THEME_STORAGE_KEY, type ThemeName } from "@/lib/theme";

// ─────────────────────────────────────────────────────────────────────────────
//  ThemeProvider — light/dark theme state for the whole app.
//
//  The initial theme is already applied to <html data-theme> by the no-flash
//  inline script in layout.tsx (before React hydrates), so on mount we just read
//  it back from the DOM to stay in sync — no flash, no mismatch. Changing the
//  theme writes localStorage + the data-theme attribute; all `--brand-*` CSS
//  variables (globals.css) re-resolve instantly.
// ─────────────────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: ThemeName;
  toggleTheme: () => void;
  setTheme: (t: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: ThemeName) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to "light" for the very first SSR/client render; the effect below
  // immediately reconciles with what the no-flash script already set.
  const [theme, setThemeState] = useState<ThemeName>("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "dark" || current === "light") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronise the pre-hydration theme script with the React provider.
      setThemeState(current);
    }
  }, []);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    applyTheme(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: ThemeName = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
