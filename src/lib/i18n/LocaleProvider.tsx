"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { bnDictionary } from "./dictionary";

export type Locale = "en" | "bn";

const STORAGE_KEY = "admin-panel-locale";

interface LocaleContextValue {
  locale: Locale;
  toggleLocale: () => void;
  translate: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Always render "en" on the server and on first client paint so
  // server/client markup matches (no hydration mismatch); swap to the
  // stored preference right after mount. This means a bn-preferring user
  // sees a brief flash of English chrome on load -- an acceptable tradeoff
  // for an internal admin tool versus the complexity of a cookie-based,
  // server-readable locale.
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "bn") setLocale(stored);
    } catch {
      // localStorage can throw in some private-browsing contexts -- fall
      // back to English rather than crashing the whole layout.
    }
  }, []);

  function toggleLocale() {
    setLocale((prev) => {
      const next = prev === "en" ? "bn" : "en";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // best-effort persistence only
      }
      return next;
    });
  }

  function translate(key: string): string {
    if (locale === "en") return key;
    return bnDictionary[key] ?? key;
  }

  return <LocaleContext.Provider value={{ locale, toggleLocale, translate }}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
}
