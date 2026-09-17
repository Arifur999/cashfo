// Server-only (imports next/headers) -- for Server Component pages that
// render JSX directly instead of delegating to a "use client" *PageClient
// component. Those need a way to know the current locale WITHOUT a React
// hook (hooks don't work in Server Components), so the toggle in
// LocaleProvider.tsx writes this same cookie (not just React state) and
// this reads it back. Mirrors how activeBusiness.ts's own cookie already
// lets Server Components resolve a client-set preference.
import { cookies } from "next/headers";
import type { Locale } from "./translate";

export const LOCALE_COOKIE = "locale";

export async function getLocale(): Promise<Locale> {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  return stored === "bn" ? "bn" : "en";
}
