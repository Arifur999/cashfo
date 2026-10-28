// Server-only (reads the session and the language cookie): the reader's Fmt
// (lib/i18n/formatPrefs.ts) for Server Components that format money, counts
// and dates themselves. Built from the same getCurrentUser() the customer
// layout reads and hands to LocaleProvider, so the server's text and the
// hydrated client's match. cache() keeps it to one per request, and nothing
// is kept between requests.
import { cache } from "react";
import { type Fmt, resolveFmt } from "@/lib/i18n/formatPrefs";
import { getLocale } from "@/lib/i18n/locale";
import { getCurrentUser } from "./auth";

export const getFmt = cache(async (): Promise<Fmt> => {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  return resolveFmt(user?.preferences ?? null, locale);
});
