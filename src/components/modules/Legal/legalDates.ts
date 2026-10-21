import { formatDate } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";
import type { Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";

// The day a legal page's version took effect, on the app's calendar:
// "12 October 2026", or "১২ অক্টোবর ২০২৬" with the month the dictionary
// words (shared.ts) and the reader's digits.
export function effectiveDateText(iso: string, locale: Locale, t: Translate): string {
  if (locale !== "bn") {
    return formatDate(iso, "d MMMM yyyy");
  }
  const day = formatDate(iso, "d", "");
  if (!day) {
    return "—";
  }
  return `${toLocaleDigits(day, locale)} ${t(formatDate(iso, "MMMM"))} ${toLocaleDigits(formatDate(iso, "yyyy"), locale)}`;
}
