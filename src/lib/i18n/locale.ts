// Server-only (imports next/headers) -- for layouts that seed
// LocaleProvider, and Server Component pages that render text directly
// instead of delegating to a "use client" component. The toggle in
// LocaleProvider.tsx writes the cookie this reads.
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "./localeCookie";
import { getTranslationOverrides } from "./overrides";
import { type FillValues, fillText } from "./fill";
import type { Translate } from "./message";
import { type DictionaryScope, translate, type Locale } from "./translate";

export async function getLocale(): Promise<Locale> {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  return stored === "bn" ? "bn" : "en";
}

// For Server Components that render text themselves: the reader's language
// and the admin-edited Bangla, as one t() that also fills {placeholders}.
// The admin panel's Server Components pass "admin" for its own wording.
export async function getTranslator(scope: DictionaryScope = "app"): Promise<{ locale: Locale; t: Translate }> {
  const [locale, overrides] = await Promise.all([getLocale(), getTranslationOverrides()]);
  const t = (key: string, values?: FillValues) => {
    const text = translate(locale, key, overrides, scope);
    return values ? fillText(text, values) : text;
  };
  return { locale, t };
}
