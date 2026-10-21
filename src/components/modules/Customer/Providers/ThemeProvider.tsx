"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { THEME_ALLOWED_KEY, THEME_STORAGE_KEY, themeAllowedValue } from "@/lib/theme";

// Class-based dark mode for the customer app (see globals.css's .dark
// block). The root layout's inline THEME_INIT_SCRIPT sets the class before
// the first paint of a full page load; this provider keeps it in sync after
// that -- including on client-side navigations into the app, which don't
// re-run the script -- and takes it off again when the app unmounts, so the
// sign-in pages it can lead to stay light.
type Theme = "light" | "dark";
// What the user chose: a theme, or to follow the device.
export type ThemePreference = Theme | "system";

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  // The dark_mode feature flag: while it's off the app stays light and
  // nothing should offer a theme choice.
  allowDark: boolean;
  setTheme: (preference: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const CHANGE_EVENT = "app:theme";
// Where a choice lands when localStorage is blocked (private browsing), so
// the toggle still works for this page load.
let unsavedChoice: ThemePreference | null = null;

const readPreference = (): ThemePreference => {
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
  return "system";
};

const readTheme = (): Theme => {
  const preference = readPreference();
  if (preference !== "system") return preference;
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
// switches in the top bar, the phone drawer and Settings are hidden. Every
// mount must pass it: one that assumed "on" would show dark while the flag
// is off, and save "1" over the "0" that keeps the next page load light.
export function ThemeProvider({ children, allowDark }: { children: ReactNode; allowDark: boolean }) {
  // The server can't see the choice, so it (and hydration) render "light";
  // the real value follows right after, without a setState in an effect.
  const chosen = useSyncExternalStore<Theme>(subscribe, readTheme, () => "light");
  const preference = useSyncExternalStore<ThemePreference>(subscribe, readPreference, () => "system");
  const theme: Theme = allowDark ? chosen : "light";

  // With the flag off this also takes off the class THEME_INIT_SCRIPT may
  // have added before the flag was saved.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Saved for THEME_INIT_SCRIPT, which can't see the flag: with it off, the
  // next full page load starts light instead of flashing dark until this
  // provider takes the class off again.
  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_ALLOWED_KEY, themeAllowedValue(allowDark));
    } catch {
      // Blocked storage: the script can't read it either, so it leaves the
      // page light and the effect above applies the theme after hydration.
    }
  }, [allowDark]);

  useEffect(() => () => document.documentElement.classList.remove("dark"), []);

  const setTheme = useCallback(
    (next: ThemePreference) => {
      // Nothing changes the saved choice while the flag is off, so it is
      // still there when dark mode is switched back on.
      if (!allowDark) return;
      try {
        if (next === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
        else window.localStorage.setItem(THEME_STORAGE_KEY, next);
        unsavedChoice = null;
      } catch {
        unsavedChoice = next;
      }
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [allowDark],
  );

  const toggleTheme = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);

  const value = useMemo(() => ({ theme, preference, allowDark, setTheme, toggleTheme }), [theme, preference, allowDark, setTheme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme() must be called within a ThemeProvider (see app/(customerLayout)/layout.tsx)");
  }
  return ctx;
}
