"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useState } from "react";
import { translate, type Locale } from "./translate";

// Duplicated from locale.ts's own LOCALE_COOKIE constant rather than
// imported -- that file pulls in next/headers (server-only) and must never
// be imported from a Client Component like this one.
const LOCALE_COOKIE = "locale";
const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

interface LocaleContextValue {
  locale: Locale;
  toggleLocale: () => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

interface LocaleProviderProps {
  // Resolved server-side (see locale.ts's getLocale(), read in
  // (dashboard)/layout.tsx from the same cookie this provider writes) so
  // the client's first render already matches whatever Server Component
  // pages rendered -- no post-mount flash/hydration mismatch, same
  // "resolve on the server, seed the client from it" pattern
  // activeBusinessId already uses via AuthProvider.
  initialLocale: Locale;
  children: React.ReactNode;
}

export function LocaleProvider({ initialLocale, children }: LocaleProviderProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const router = useRouter();

  function toggleLocale() {
    const next: Locale = locale === "en" ? "bn" : "en";
    setLocale(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}`;
    // Server Component pages (most of this app's pages.tsx files) resolve
    // their own copy of the locale straight from the cookie via
    // getLocale() -- router.refresh() is what makes them re-render with it
    // right away instead of only on the next real navigation.
    router.refresh();
  }

  function t(key: string): string {
    return translate(locale, key);
  }

  return (
    <LocaleContext.Provider value={{ locale, toggleLocale, t }}>
      {/* --font-bn (Hind Siliguri) is already loaded in layout.tsx and
          declared under globals.css's @theme inline block -- this is the
          first thing that actually switches to it, everywhere else in the
          app still only uses --font-sans (Inter). Applied on a wrapper div
          rather than <html>/<body> so it composes with the rest of the tree
          without touching the root layout. display:contents keeps this
          wrapper from affecting the flex layout it sits inside. */}
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
