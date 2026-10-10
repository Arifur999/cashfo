"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { bnDictionary } from "./dictionary";

export type Locale = "en" | "bn";

const STORAGE_KEY = "admin-panel-locale";

interface LocaleContextValue {
  locale: Locale;
  toggleLocale: () => void;
  translate: (key: string) => string;
}

// What a component rendered outside the provider (a test, a portal) gets:
// readable English instead of a crash.
const fallbackContext: LocaleContextValue = {
  locale: "en",
  toggleLocale: () => {},
  translate: (key) => key,
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Renders "en" on the server and the first client paint (so the markup
  // matches), then switches to the stored preference -- usePersistentState
  // does that through useSyncExternalStore, no setState-in-effect cascade.
  // A bn-preferring admin still sees a brief flash of English chrome, an
  // acceptable tradeoff versus a cookie-based, server-readable locale.
  const [storedLocale, setStoredLocale] = usePersistentState<Locale>(STORAGE_KEY, "en");
  const locale: Locale = storedLocale === "bn" ? "bn" : "en";

  // Screen readers pick pronunciation from <html lang>; without this, Bangla
  // text is read with English phonetics.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const toggleLocale = useCallback(() => setStoredLocale(locale === "en" ? "bn" : "en"), [locale, setStoredLocale]);
  const translate = useCallback((key: string) => (locale === "en" ? key : (bnDictionary[key] ?? key)), [locale]);
  const value = useMemo(() => ({ locale, toggleLocale, translate }), [locale, toggleLocale, translate]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext) ?? fallbackContext;
}
