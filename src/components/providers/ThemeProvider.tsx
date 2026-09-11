"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// Class-based dark mode (see globals.css's @custom-variant dark). The
// choice persists in localStorage; on first visit (nothing stored yet) it
// follows the OS's prefers-color-scheme. The actual .dark class is applied
// by an inline script in the root layout's <head> (see app/layout.tsx) --
// that runs before React hydrates, so there's no flash of the wrong theme
// and no hydration mismatch here. This provider just reads back whatever
// class the script already set (document.documentElement.classList) as its
// initial state, then keeps it in sync with user toggles from then on.
type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Inline script string, shared with app/layout.tsx so the FOUC-prevention
// logic and this provider's initial-state read are guaranteed to agree on
// exactly how the choice is determined.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private browsing / storage disabled -- the toggle still works for
      // this page load, it just won't be remembered next visit.
    }
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme() must be called within a ThemeProvider (see app/layout.tsx)");
  }
  return ctx;
}
