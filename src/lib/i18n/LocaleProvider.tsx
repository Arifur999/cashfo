"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { bnDictionary } from "./dictionary";

export type Locale = "en" | "bn";

const STORAGE_KEY = "user-app-locale";

interface LocaleContextValue {
  locale: Locale;
  toggleLocale: () => void;
  // Named `t`, not `translate`, matching this app's existing t()-wrapper
  // convention (see e.g. SettingsForm.tsx) rather than admin-frontend's own
  // `translate` name -- same mechanism (the English string doubles as the
  // dictionary key), different name to match user-frontend's own style.
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

// Mirrors admin-frontend's own LocaleProvider (src/lib/i18n/LocaleProvider.tsx)
// -- same "always render en on the server and first client paint, swap to
// the stored preference right after mount" tradeoff to avoid a hydration
// mismatch, same localStorage-only persistence (not tied to
// User.preferredLanguage -- that field exists and is admin/self-editable via
// Settings, but wiring THIS toggle to it is future work, not part of this
// pass).
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time sync with a browser-only API (localStorage), not derivable during SSR/first paint.
      if (stored === "en" || stored === "bn") setLocale(stored);
    } catch {
      // localStorage can throw in some private-browsing contexts -- fall
      // back to English rather than crashing the whole dashboard.
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

  function t(key: string): string {
    if (locale === "en") return key;
    return bnDictionary[key] ?? key;
  }

  return (
    <LocaleContext.Provider value={{ locale, toggleLocale, t }}>
      {/* --font-bn (Hind Siliguri) is already loaded in layout.tsx and
          declared under globals.css's @theme inline block -- this is the
          first thing that actually switches to it, everywhere else in the
          app still only uses --font-sans (Inter). Applied on a wrapper div
          rather than <html>/<body> so it composes with the rest of the tree
          without touching the root layout. */}
      <div className={locale === "bn" ? "font-bn contents" : "contents"}>{children}</div>
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
}
