// Plain, isomorphic (no "use client"/"use server", no next/headers import)
// -- safe to import from BOTH Server Components (via locale.ts's
// getLocale()) and Client Components (via LocaleProvider.tsx's useLocale()).
// The English string doubles as the dictionary key (same mechanism
// admin-frontend's own translate() uses) so adding a translation never
// requires inventing a new key name -- just wrap the existing JSX text.
import { bnDictionary } from "./dictionary";

export type Locale = "en" | "bn";

export function translate(locale: Locale, key: string): string {
  if (locale === "en") return key;
  // hasOwn, not `bnDictionary[key] ?? key`: user-typed text (custom habit
  // names) goes through here too, and a name like "constructor" or
  // "toString" would otherwise resolve to an inherited Object.prototype
  // function instead of falling back to the key itself.
  return Object.hasOwn(bnDictionary, key) ? bnDictionary[key] : key;
}
