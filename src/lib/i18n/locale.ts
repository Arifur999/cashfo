// Server-only (imports next/headers) -- for layouts that seed
// LocaleProvider, and Server Component pages that render text directly
// instead of delegating to a "use client" component. The toggle in
// LocaleProvider.tsx writes the cookie this reads.
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "./localeCookie";
import type { Locale } from "./translate";

export async function getLocale(): Promise<Locale> {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  return stored === "bn" ? "bn" : "en";
}
