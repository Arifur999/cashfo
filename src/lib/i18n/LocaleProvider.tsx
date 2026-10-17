"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { type FillValues, fillText } from "./fill";
import { inEnglish } from "./message";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE_SECONDS } from "./localeCookie";
import { translate as translateTo, type Locale, type TranslationOverrides } from "./translate";

export type { Locale };

interface LocaleContextValue {
  locale: Locale;
  toggleLocale: () => void;
  // One function, two names: the admin panel calls it translate(), the
  // customer app t(). Values fill the sentence's {placeholders} after it is
  // translated: translate("{count} tries", { count: 3 }).
  translate: (key: string, values?: FillValues) => string;
  t: (key: string, values?: FillValues) => string;
}

const fillIn = (text: string, values?: FillValues) => (values ? fillText(text, values) : text);

// What a component rendered outside the provider (a test, a portal) gets:
// readable English instead of a crash.
const fallbackContext: LocaleContextValue = {
  locale: "en",
  toggleLocale: () => {},
  translate: inEnglish,
  t: inEnglish,
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

interface LocaleProviderProps {
  // Read from the cookie by the layout (getLocale() in locale.ts), so the
  // first render already matches what Server Components rendered -- no
  // flash of English for a Bangla reader.
  initialLocale?: Locale;
  // The admin-edited Bangla (getTranslationOverrides() in overrides.ts).
  overrides?: TranslationOverrides;
  children: React.ReactNode;
}

export function LocaleProvider({ initialLocale = "en", overrides, children }: LocaleProviderProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const router = useRouter();

  // Screen readers pick pronunciation from <html lang>; without this, Bangla
  // text is read with English phonetics.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const toggleLocale = useCallback(() => {
    const next: Locale = locale === "en" ? "bn" : "en";
    setLocale(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
    // Server Components read the cookie themselves; a refresh re-renders
    // them in the new language now rather than on the next navigation.
    router.refresh();
  }, [locale, router]);

  const translate = useCallback((key: string, values?: FillValues) => fillIn(translateTo(locale, key, overrides), values), [locale, overrides]);
  const value = useMemo(() => ({ locale, toggleLocale, translate, t: translate }), [locale, toggleLocale, translate]);

  return (
    <LocaleContext.Provider value={value}>
      {/* Bangla reads in Hind Siliguri (loaded by the root layout); the
          wrapper is display:contents so it doesn't touch the layout. */}
      <div className={locale === "bn" ? "contents font-bn" : "contents"}>{children}</div>
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext) ?? fallbackContext;
}
