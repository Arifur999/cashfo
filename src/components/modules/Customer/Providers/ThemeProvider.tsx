"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme";

// Class-based dark mode for the customer app (see globals.css's .dark
// block). The root layout's inline THEME_INIT_SCRIPT sets the class before
// the first paint of a full page load; this provider keeps it in sync after
// that -- including on client-side navigations into the app, which don't
// re-run the script -- and takes it off again when the app unmounts, so the
// sign-in pages it can lead to stay light.
type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const CHANGE_EVENT = "app:theme";
// Where a choice lands when localStorage is blocked (private browsing), so
// the toggle still works for this page load.
let unsavedChoice: Theme | null = null;

const readTheme = (): Theme => {
  if (unsavedChoice) {
    return unsavedChoice;
  }
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch {
    // Blocked storage: fall through to the OS setting.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const subscribe = (onChange: () => void) => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
    media.removeEventListener("change", onChange);
  };
};

// allowDark is the dark_mode feature flag (Admin > System > Feature Flags):
// when it's off the app stays light whatever was chosen before, and the
// switch in the top bar is hidden.
export function ThemeProvider({ children, allowDark = true }: { children: ReactNode; allowDark?: boolean }) {
  // The server can't see the choice, so it (and hydration) render "light";
  // the real value follows right after, without a setState in an effect.
  const chosen = useSyncExternalStore<Theme>(subscribe, readTheme, () => "light");
  const theme: Theme = allowDark ? chosen : "light";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => () => document.documentElement.classList.remove("dark"), []);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
      unsavedChoice = null;
    } catch {
      unsavedChoice = next;
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, [theme]);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme() must be called within a ThemeProvider (see app/(customerLayout)/layout.tsx)");
  }
  return ctx;
}
