// Plain, isomorphic (no "use client"/"use server", no next/headers import)
// -- safe to import from BOTH Server Components (via locale.ts's
// getLocale()) and Client Components (via LocaleProvider.tsx's useLocale()).
// The English string doubles as the dictionary key (same mechanism
// admin-frontend's own translate() uses) so adding a translation never
// requires inventing a new key name -- just wrap the existing JSX text.
import { bnAdminScopeDictionary, bnDictionary } from "./dictionary";
import { withoutContext } from "./message";

export { withoutContext };

export type Locale = "en" | "bn";

// Which wording wins where the admin panel and the customer app differ.
export type DictionaryScope = "app" | "admin";

// Admin > Content > Translations: the Bangla the admins edited, by the
// English text it replaces (backend GET /api/platform/translations). It wins
// over the built-in dictionaries.
export type TranslationOverrides = Record<string, string>;

export function translate(locale: Locale, key: string, overrides?: TranslationOverrides, scope: DictionaryScope = "app"): string {
  if (locale === "en") return withoutContext(key);
  if (overrides && Object.hasOwn(overrides, key)) return overrides[key];
  const dictionary = scope === "admin" ? bnAdminScopeDictionary : bnDictionary;
  // hasOwn, not `bnDictionary[key] ?? key`: user-typed text (custom habit
  // names) goes through here too, and a name like "constructor" or
  // "toString" would otherwise resolve to an inherited Object.prototype
  // function instead of falling back to the key itself.
  if (Object.hasOwn(dictionary, key)) return dictionary[key];
  // "Open@@status" with no entry of its own reads like plain "Open".
  const plain = withoutContext(key);
  return plain === key ? key : translate(locale, plain, overrides, scope);
}
