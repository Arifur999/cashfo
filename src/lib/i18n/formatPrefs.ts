// How a reader wants numbers and dates written (Settings › App preferences,
// PATCH /api/auth/preferences): the digits, the grouping of big amounts, the
// date style of lists, reports and statements, and the first day of a week.
//
// Every central formatter (formatCount, toLocaleDigits, formatCurrency,
// formatDate, ...) takes a FormatLocale: either a plain Locale, which writes
// as the language always has (the admin panel passes that), or a Fmt, which
// also carries the reader's choices. A Fmt resolved from no preferences
// writes exactly what its plain Locale does, so passing one is never a change
// for a reader who chose nothing.
//
// Plain and isomorphic: the customer layout reads the preferences once and
// hands the same ones to the client's LocaleProvider and the server's
// getFmt(), so a Server Component and the hydrated client print the same text.
import { toBanglaDigits } from "./banglaDates";
import type { Locale } from "./translate";

export type DigitSystem = "latin" | "bengali";
export type Grouping = "lakh" | "international";
// The API's own words: "2 Oct 2026", "02/10/2026", "2026-10-02".
export type DateStyle = "D_MMM_YYYY" | "DD_MM_YYYY" | "YYYY_MM_DD";
// 0 = Sunday … 6 = Saturday, as Date counts them.
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Fmt {
  // The reader's language: words, month and weekday names.
  readonly locale: Locale;
  readonly digits: DigitSystem;
  readonly grouping: Grouping;
  readonly dateStyle: DateStyle;
  readonly weekStart: Weekday;
  // Amounts to the whole taka (Settings › App preferences); saved ones keep their paisa.
  readonly round: boolean;
}

export type FormatLocale = Locale | Fmt;

// What GET /api/auth/me returns as `preferences` (DisplayPreferences in
// lib/customer/api.ts), written loosely so a missing or older field falls
// back to the default.
export interface FormatPreferences {
  digitStyle?: "LATIN" | "BENGALI" | null;
  numberGrouping?: "LAKH" | "INTERNATIONAL" | null;
  dateStyle?: DateStyle | null;
  weekStart?: "SATURDAY" | "SUNDAY" | "MONDAY" | null;
  roundAmounts?: boolean | null;
}

// The app's week runs Saturday to Friday unless the reader says otherwise.
export const DEFAULT_WEEK_START: Weekday = 6;

const WEEK_START_DAY: Record<NonNullable<FormatPreferences["weekStart"]>, Weekday> = { SUNDAY: 0, MONDAY: 1, SATURDAY: 6 };
const DATE_STYLES: readonly DateStyle[] = ["D_MMM_YYYY", "DD_MM_YYYY", "YYYY_MM_DD"];

// One frozen value per language, so fmtOf("bn") is the same object every
// time (cheap, and stable as a React dependency).
const PLAIN: Record<Locale, Fmt> = {
  en: Object.freeze({ locale: "en", digits: "latin", grouping: "lakh", dateStyle: "D_MMM_YYYY", weekStart: DEFAULT_WEEK_START, round: false }),
  bn: Object.freeze({ locale: "bn", digits: "bengali", grouping: "lakh", dateStyle: "D_MMM_YYYY", weekStart: DEFAULT_WEEK_START, round: false }),
};

// The reader's choices in their language. No preferences (or a field left
// unset) reads as the language's own way: Bangla digits in Bangla, Latin in
// English, lakh grouping, "2 Oct 2026", weeks from Saturday.
export function resolveFmt(preferences: FormatPreferences | null | undefined, locale: Locale): Fmt {
  const plain = PLAIN[locale];
  if (!preferences) return plain;
  const digits: DigitSystem = preferences.digitStyle === "BENGALI" ? "bengali" : preferences.digitStyle === "LATIN" ? "latin" : plain.digits;
  const grouping: Grouping = preferences.numberGrouping === "INTERNATIONAL" ? "international" : "lakh";
  const dateStyle = preferences.dateStyle && DATE_STYLES.includes(preferences.dateStyle) ? preferences.dateStyle : plain.dateStyle;
  const weekStart = (preferences.weekStart && WEEK_START_DAY[preferences.weekStart]) ?? plain.weekStart;
  const round = preferences.roundAmounts === true;
  if (digits === plain.digits && grouping === plain.grouping && dateStyle === plain.dateStyle && weekStart === plain.weekStart && !round) return plain;
  return Object.freeze({ locale, digits, grouping, dateStyle, weekStart, round });
}

// Either form as a Fmt: a plain Locale is that language's own way.
export const fmtOf = (value: FormatLocale | null | undefined): Fmt => (value == null ? PLAIN.en : typeof value === "string" ? PLAIN[value] : value);

// The language alone, for the words (t(), names, Record<Locale, …> lookups).
export const langOf = (value: FormatLocale | null | undefined): Locale => fmtOf(value).locale;

// The same choices in another language: what the Settings preview shows the
// moment the language flips, before the page reads the account again.
export const withLocale = (value: FormatLocale, locale: Locale): Fmt => {
  const fmt = fmtOf(value);
  if (fmt.locale === locale) return fmt;
  return typeof value === "string" ? PLAIN[locale] : Object.freeze({ ...fmt, locale });
};

// "1,234" in the reader's digits: Bangla digits can come under an English
// page and Latin ones under a Bangla page. Only the digits change.
export const writeDigits = (text: string, value: FormatLocale): string => (fmtOf(value).digits === "bengali" ? toBanglaDigits(text) : text);

// The Intl locale that groups a taka amount: en-IN's lakh and crore
// (12,50,000) or groups of three (1,250,000).
export const takaGroupingLocale = (value: FormatLocale): string => (fmtOf(value).grouping === "international" ? "en-US" : "en-IN");

// Taka's sign as the reader's language writes it: "৳" in Bangla, "TK" in
// English. It follows the language, not the digits, so an English page with
// Bangla digits still says "TK ১২,৫০০".
export const takaSign = (value: FormatLocale | null | undefined): string => (langOf(value) === "bn" ? "৳" : "TK");

// The full day-month-year of a pattern, the way lists, reports and
// statements write it ("d MMM yyyy", "MMM dd, yyyy"; a weekday or a time
// around it stays). Short ("d MMM") and long-month ("d MMMM yyyy") forms are
// headings and labels, not the date style, and are left as they are.
const FULL_DATE = /\bd{1,2} MMM,? y{4}\b|\bMMM d{1,2},? y{4}\b/g;
const STYLE_PATTERN: Record<DateStyle, string> = { D_MMM_YYYY: "d MMM yyyy", DD_MM_YYYY: "dd/MM/yyyy", YYYY_MM_DD: "yyyy-MM-dd" };

// A date-fns pattern in the reader's date style. The default style leaves
// every pattern exactly as written, so nothing moves for a reader who chose
// nothing (and the admin panel's "MMM dd, yyyy" stays).
export function datePattern(pattern: string, value: FormatLocale): string {
  const { dateStyle } = fmtOf(value);
  if (dateStyle === "D_MMM_YYYY") return pattern;
  return pattern.replace(FULL_DATE, STYLE_PATTERN[dateStyle]);
}

// Whether a pattern has a full date the date style rewrites.
export const hasFullDate = (pattern: string): boolean => new RegExp(FULL_DATE.source).test(pattern);

// The first day of the reader's week (0 = Sunday … 6 = Saturday).
export const weekStartOf = (value: FormatLocale | null | undefined): Weekday => fmtOf(value).weekStart;

// The seven weekdays in the reader's order, first day first:
// Saturday -> [6, 0, 1, 2, 3, 4, 5].
export const weekdayOrder = (value: FormatLocale | null | undefined): Weekday[] => {
  const start = weekStartOf(value);
  return Array.from({ length: 7 }, (_, i) => ((start + i) % 7) as Weekday);
};

// Whether the reader writes dates in numbers ("02/10/2026", "2026-10-02"):
// then a range or a list names the year on every day it shows, since "27/09"
// beside "02/10/2026" would read as a different style.
export const numericDates = (value: FormatLocale | null | undefined): boolean => fmtOf(value).dateStyle !== "D_MMM_YYYY";

// A translated heading whose number is part of the dictionary's sentence
// ("Last 6 months", "গত ৬ মাস"), in the reader's digits.
export const redigit = (text: string, value: FormatLocale): string => writeDigits(text.replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - 0x09e6)), value);
