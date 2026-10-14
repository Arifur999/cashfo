// Server-only (imports next/headers) -- for layouts that seed
// LocaleProvider, and Server Component pages that render text directly
// instead of delegating to a "use client" component. The toggle in
// LocaleProvider.tsx writes the cookie this reads.
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "./localeCookie";
import { getTranslationOverrides } from "./overrides";
import { translate, type Locale } from "./translate";

export async function getLocale(): Promise<Locale> {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  return stored === "bn" ? "bn" : "en";
}

// For Server Components that render text themselves: the reader's language
// and the admin-edited Bangla, as one t().
export async function getTranslator(): Promise<{ locale: Locale; t: (key: string) => string }> {
  const [locale, overrides] = await Promise.all([getLocale(), getTranslationOverrides()]);
  return { locale, t: (key: string) => translate(locale, key, overrides) };
}
