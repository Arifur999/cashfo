import { APP_TIME_ZONE } from "@/lib/date";
import type { Locale } from "@/lib/i18n/translate";

// "Good morning" until noon, "Good afternoon" until 6 pm, then "Good
// evening" -- English keys for t().
export function greetingFor(hour: number): "Good morning" | "Good afternoon" | "Good evening" {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// The hour of the day in the platform's timezone (0–23).
export function hourIn(zone: string, now: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "numeric", hourCycle: "h23" }).format(now);
  return Number(hour);
}

// "Friday, 2 October · 21 Rabiʻ II 1448": the day in the Gregorian and the
// Hijri calendar, as the Home eyebrow shows it, in the reader's language.
export function homeDateLine(now: Date, locale: Locale, zone: string = APP_TIME_ZONE): string {
  const tag = locale === "bn" ? "bn-BD" : "en-GB";
  const gregorian = new Intl.DateTimeFormat(tag, { timeZone: zone, weekday: "long", day: "numeric", month: "long" }).format(now);
  const hijri = new Intl.DateTimeFormat(`${tag}-u-ca-islamic-umalqura`, { timeZone: zone, day: "numeric", month: "long", year: "numeric" })
    .formatToParts(now)
    .filter((part) => ["day", "month", "year", "literal"].includes(part.type))
    .map((part) => (part.type === "literal" ? " " : part.value))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return `${gregorian} · ${hijri}`;
}
