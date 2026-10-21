// Dates on the admin home pages (the dashboards, Analytics, Settings) in the
// reader's language: thin wrappers over lib/date.ts, which writes the Bangla
// months, am/pm and digits itself ("১৪ অক্টো, ২:১০ অপরাহ্ণ"). The words
// ("Today", "Yesterday") come through translate(). Plain and isomorphic.
import { formatDate, formatLogTime, formatMonthKey, formatMonthName, formatRelativeDateTime, formatRelativeDay, toDateInputValue } from "@/lib/date";
import { banglaMonthShort, toBanglaDigits } from "@/lib/i18n/banglaDates";
import { inEnglish, type Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";

type DateInput = string | number | Date | null | undefined;

// A calendar day ("2026-10-05", no time zone) as a chart axis or a range
// writes it: "5 Oct", "৫ অক্টো". Noon UTC is the same day in Dhaka.
export const calendarDay = (day: string, locale: Locale): string => formatDate(`${day}T12:00:00Z`, "d MMM", "—", locale);

// "2 Sep – 1 Oct": the days an analytics range covers.
export const daySpan = (from: string, to: string, locale: Locale): string => `${calendarDay(from, locale)} – ${calendarDay(to, locale)}`;

// The day something happened, in the platform's time zone: "14 Oct", or
// "2 Jun 2025" from another year ("১৪ অক্টো", "২ জুন ২০২৫").
export const dayLabel = (value: DateInput, locale: Locale, now: Date = new Date()): string => {
  const day = toDateInputValue(value);
  if (!day) return "—";
  const thisYear = day.slice(0, 4) === toDateInputValue(now).slice(0, 4);
  return formatDate(value, thisYear ? "d MMM" : "d MMM yyyy", "—", locale);
};

interface WhenOptions {
  t?: Translate;
  now?: Date;
}

// "Today, 2:10 pm", "Yesterday, 6:55 pm", else "14 Oct, 2:10 pm".
export const dateTimeLabel = (value: DateInput, locale: Locale, { t = inEnglish, now = new Date() }: WhenOptions = {}): string => formatRelativeDateTime(value, { t, now, locale });

// "Today, 2:10 pm", "Yesterday", else the day: when something last happened.
export const relativeDayLabel = (value: DateInput, locale: Locale, { t = inEnglish, now = new Date() }: WhenOptions = {}): string => formatRelativeDay(value, { t, now, locale });

// A log row's time: "2:10 pm" while it is today, else with the day.
export const logTimeLabel = (value: DateInput, locale: Locale, { t = inEnglish, now = new Date() }: WhenOptions = {}): string => formatLogTime(value, { t, now, locale });

// A month key ("2026-10") under a bar: "Oct", "অক্টো".
export const shortMonth = (key: string, locale: Locale): string => (locale === "bn" ? banglaMonthShort(key) : formatMonthKey(key, false));

// "October", or "October 2025" where a list runs over more than one year.
export const monthLabel = (key: string, locale: Locale, t: Translate = inEnglish, withYear = false): string => {
  const month = t(formatMonthName(key));
  return withYear ? t("{month} {year}", { month, year: locale === "bn" ? toBanglaDigits(key.slice(0, 4)) : key.slice(0, 4) }) : month;
};
