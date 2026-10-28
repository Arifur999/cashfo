import { APP_TIME_ZONE } from "@/lib/date";
import { type FormatLocale, langOf, writeDigits } from "@/lib/i18n/formatPrefs";

// "Good morning" until noon, "Good afternoon" until 6 pm, then "Good
// evening" -- English keys for t().
export function greetingFor(hour: number): "Good morning" | "Good afternoon" | "Good evening" {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Titles that open many Bangladeshi names ("Md. Arifur Rahman", "Mst Nasrin
// Akter", "Engr. Rakib"), written without their dot as often as with it.
const HONORIFICS = new Set(["md", "mst", "mohd", "dr", "engr", "mr", "mrs"]);

// A title or an initial: a word that ends in a dot or a visarga ("Md.",
// "মোঃ", "মোছাঃ", "ডাঃ", "A.", or "মো:" typed with a colon), or one of the
// titles above.
const isHonorific = (word: string) => /[.:ঃ]$/.test(word) || HONORIFICS.has(word.toLowerCase());

// The name Home greets someone by: the first word that is not a title, so
// "Md. Arifur Rahman" reads "Good evening, Arifur". A name that is all
// titles is used whole.
export function greetingName(name: string): string {
  const full = name.trim();
  return full.split(/\s+/).find((word) => word && !isHonorific(word)) ?? full;
}

// The hour of the day in the platform's timezone (0–23).
export function hourIn(zone: string, now: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "numeric", hourCycle: "h23" }).format(now);
  return Number(hour);
}

// "Friday, 2 October" and "21 Rabiʻ II 1448": the day in the Gregorian and
// the Hijri calendar, in the reader's language, for the Home eyebrow (phones
// show only the first).
// hijriAdjust shifts the Hijri date a day either way (the prayer settings).
export function homeDates(now: Date, locale: FormatLocale, zone: string = APP_TIME_ZONE, hijriAdjust = 0): { day: string; hijri: string } {
  // Latin digits from Intl, then the reader's own (formatPrefs.ts).
  const tag = langOf(locale) === "bn" ? "bn-BD-u-nu-latn" : "en-GB";
  // Put together from its parts: ICU versions disagree about the comma
  // after the weekday.
  const parts = new Intl.DateTimeFormat(tag, { timeZone: zone, weekday: "long", day: "numeric", month: "long" }).formatToParts(now);
  const piece = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const day = writeDigits(`${piece("weekday")}, ${piece("day")} ${piece("month")}`, locale);
  const hijri = new Intl.DateTimeFormat(`${tag.replace("-u-nu-latn", "")}-u-ca-islamic-umalqura-nu-latn`, { timeZone: zone, day: "numeric", month: "long", year: "numeric" })
    .formatToParts(new Date(now.getTime() - hijriAdjust * 86400000))
    .filter((part) => ["day", "month", "year", "literal"].includes(part.type))
    .map((part) => (part.type === "literal" ? " " : part.value))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return { day, hijri: writeDigits(hijri, locale) };
}
