import { TZDate } from "@date-fns/tz";
import { format, type Locale as DateFnsLocale } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { BN_AM, BN_MONTHS_LONG, BN_MONTHS_SHORT, BN_PM, BN_WEEKDAYS_LONG, BN_WEEKDAYS_SHORT, toBanglaDigits } from "@/lib/i18n/banglaDates";
import { formatCount } from "@/lib/i18n/digits";
import { datePattern, fmtOf, type FormatLocale, writeDigits } from "@/lib/i18n/formatPrefs";
import { inEnglish, type Translate } from "@/lib/i18n/message";

// Every date in the panel renders in the platform's own timezone, not the
// machine's. A Server Component on a UTC host and the hydrating browser in
// Dhaka must print the same text, or React reports a hydration mismatch --
// and admins expect "today" to mean Bangladesh's today regardless.
export const APP_TIME_ZONE = process.env.NEXT_PUBLIC_APP_TIME_ZONE ?? "Asia/Dhaka";

export const DATE_FORMAT = "MMM dd, yyyy";
export const DATE_TIME_FORMAT = "MMM dd, yyyy, hh:mm a";

type DateInput = string | number | Date | null | undefined;

// What the "Today" / "Yesterday" helpers below can be told.
export interface RelativeDateOptions {
  // The moment "today" is counted from (tests pin it).
  now?: Date;
  // What a missing or unreadable date shows.
  fallback?: string;
  // The reader's translate(), for the words ("Today", "Yesterday").
  t?: Translate;
  // The reader's language, for the rest: Bangla months, am/pm and digits
  // ("৩০ সেপ্টে", "আজ, ২:১০ অপরাহ্ণ", "৩৫ মিনিট"). Without it the dates,
  // times and counts are written as English writes them. The reader's Fmt
  // (formatPrefs.ts) also brings their digits and date style.
  locale?: FormatLocale;
}

// date-fns' English with the Bangla board's month and day names and its
// am/pm words, so one pattern ("d MMM yyyy, h:mm aaa") serves both
// languages. Fixed lists, never the browser's ICU data, so a Server
// Component and the hydrating browser print the same text.
const BANGLA_DATES: DateFnsLocale = {
  ...enUS,
  code: "bn",
  localize: {
    ...enUS.localize,
    // "১৪ অক্টোবর", never "14th"; the digits turn Bangla afterwards.
    ordinalNumber: (value) => String(value),
    month: (month, options) => (options?.width === "wide" ? BN_MONTHS_LONG : BN_MONTHS_SHORT)[month],
    day: (day, options) => (options?.width === "wide" ? BN_WEEKDAYS_LONG : BN_WEEKDAYS_SHORT)[day],
    dayPeriod: (period, options) => (period === "am" ? BN_AM : period === "pm" ? BN_PM : enUS.localize.dayPeriod(period, options)),
  },
};

// `locale` "bn" writes the same pattern in Bangla, digits and all:
// formatDate(at, "d MMM yyyy, h:mm aaa", "—", "bn") is
// "১ অক্টো ২০২৬, ২:১০ অপরাহ্ণ". Input values, query params and exports
// leave it out and keep English. Given the reader's Fmt instead, the digits
// follow their "Digits" choice and a full date ("d MMM yyyy") their "Dates"
// style: "02/10/2026, 2:10 pm"; month and weekday names stay in the language.
export const formatDate = (value: DateInput, pattern = DATE_FORMAT, fallback = "—", locale: FormatLocale = "en"): string => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  const zoned = new TZDate(date, APP_TIME_ZONE);
  if (typeof locale === "string") return locale === "bn" ? toBanglaDigits(format(zoned, pattern, { locale: BANGLA_DATES })) : format(zoned, pattern);
  const fmt = fmtOf(locale);
  const text = fmt.locale === "bn" ? format(zoned, datePattern(pattern, fmt), { locale: BANGLA_DATES }) : format(zoned, datePattern(pattern, fmt));
  return writeDigits(text, fmt);
};

export const formatDateTime = (value: DateInput, fallback = "—", locale: FormatLocale = "en") => formatDate(value, DATE_TIME_FORMAT, fallback, locale);

// A "YYYY-MM-DD" calendar day (a transaction's day, a meal's day) in a
// pattern, built from the day's own parts so no timezone moves it, in the
// reader's language, digits and date style: formatDay("2026-10-02",
// "EEE, d MMM yyyy", "bn") is "শুক্র, ২ অক্টো ২০২৬". Anything that isn't a
// day comes back as it was.
export const formatDay = (day: string, pattern: string, locale: FormatLocale = "en"): string => {
  const [year, month, date] = day.slice(0, 10).split("-").map(Number);
  if (!year || !month || !date) return day;
  const fmt = fmtOf(locale);
  const local = new Date(year, month - 1, date);
  const text = fmt.locale === "bn" ? format(local, datePattern(pattern, fmt), { locale: BANGLA_DATES }) : format(local, datePattern(pattern, fmt));
  return writeDigits(text, fmt);
};

// yyyy-MM-dd in the platform timezone, for <input type="date"> values and
// date-range query params.
export const toDateInputValue = (value: DateInput) => formatDate(value, "yyyy-MM-dd", "");

// Today's calendar date in the platform timezone. Reads the clock, so call it
// from a server render or an event handler -- never while rendering a client
// component.
export const getAppToday = () => toDateInputValue(new Date());

// A form's day as the boards write it: "Today, 2 Oct", else "30 Sep 2026".
// `day` and `today` are "YYYY-MM-DD"; `todayWord` is "Today" in the
// reader's language, and `locale` writes the date in it too ("আজ, ২ অক্টো").
export const formDayLabel = (day: string, today: string, todayWord: string, locale: FormatLocale = "en"): string => {
  if (!day) return "";
  const instant = `${day}T00:00:00.000Z`;
  return day === today ? `${todayWord}, ${formatDate(instant, "d MMM", "—", locale)}` : formatDate(instant, "d MMM yyyy", "—", locale);
};

const parseDay = (day: string) => {
  const [year, month, date] = day.split("-").map(Number);
  return { year, monthIndex: month - 1, date };
};

// "2026-10-31" -> the first / last instant of that calendar day in the
// platform timezone, as ISO strings. A coupon "valid until Oct 31" must still
// work on Oct 31 in Dhaka -- midnight UTC would end it six hours early.
export const startOfDayIso = (day: string): string => {
  const { year, monthIndex, date } = parseDay(day);
  // TZDate#toISOString keeps the zone offset; go through Date for UTC "Z".
  return new Date(new TZDate(year, monthIndex, date, 0, 0, 0, 0, APP_TIME_ZONE).getTime()).toISOString();
};

export const endOfDayIso = (day: string): string => {
  const { year, monthIndex, date } = parseDay(day);
  return new Date(new TZDate(year, monthIndex, date, 23, 59, 59, 999, APP_TIME_ZONE).getTime()).toISOString();
};

// <input type="datetime-local"> values ("2026-10-11T09:30") are read and
// written in the platform timezone, like every date the panel shows -- so a
// 09:30 announcement starts at 09:30 in Dhaka whatever the admin's machine says.
export const DATE_TIME_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export const toDateTimeInputValue = (value: DateInput) => formatDate(value, "yyyy-MM-dd'T'HH:mm", "");

export const dateTimeInputToIso = (value: string): string => {
  const [day, time] = value.split("T");
  const { year, monthIndex, date } = parseDay(day);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(new TZDate(year, monthIndex, date, hours, minutes, 0, 0, APP_TIME_ZONE).getTime()).toISOString();
};

// The calendar day before a "yyyy-MM-dd" day, as "yyyy-MM-dd".
const dayBefore = (day: string) => toDateInputValue(new Date(new Date(`${day}T12:00:00Z`).getTime() - 86_400_000));

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// "2026-10" -> "October": the month's full name for a sentence.
export const formatMonthName = (key: string): string => MONTH_NAMES[Number(key.split("-")[1]) - 1] ?? key;

// "2026-10" -> "Oct 2026" (or "Oct" with withYear = false). Month keys are
// already calendar months, so no timezone conversion applies.
export const formatMonthKey = (key: string, withYear = true): string => {
  const [year, month] = key.split("-");
  const label = MONTH_LABELS[Number(month) - 1];
  if (!label) {
    return key;
  }
  return withYear ? `${label} ${year}` : label;
};

// "Today, 11:42 am", "Yesterday", "30 Sep" (this year) or "2 Jun 2025":
// the way a list says when something last happened.
export const formatRelativeDay = (value: DateInput, { now = new Date(), fallback = "—", t = inEnglish, locale }: RelativeDateOptions = {}): string => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const day = toDateInputValue(value);
  if (!day) {
    return fallback;
  }
  const today = toDateInputValue(now);
  if (day === today) {
    return t("Today, {time}", { time: formatDate(value, "h:mm aaa", fallback, locale) });
  }
  if (day === dayBefore(today)) {
    return t("Yesterday");
  }
  return formatDate(value, day.slice(0, 4) === today.slice(0, 4) ? "d MMM" : "d MMM yyyy", fallback, locale);
};

// "35 min", "2 h", "26 h", "2 days": how long ago something happened, the
// way a support queue counts waiting time (hours up to two days). With the
// locale, the count comes in the reader's digits ("৩৫ মিনিট").
export const formatElapsed = (value: DateInput, { now = new Date(), fallback = "—", t = inEnglish, locale }: RelativeDateOptions = {}): string => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) {
    return fallback;
  }
  const count = (amount: number) => (locale ? formatCount(amount, locale) : amount);
  const minutes = Math.max(0, Math.round((now.getTime() - then) / 60_000));
  if (minutes < 60) return t("{count} min", { count: count(minutes) });
  const hours = Math.round(minutes / 60);
  if (hours < 48) return t("{count} h", { count: count(hours) });
  return t("{count} days", { count: count(Math.round(hours / 24)) });
};

// "Today, 2:10 pm", "Yesterday, 6:55 pm", "1 Oct, 8:12 pm" (this year) or
// "27 Sep 2025, 1:03 pm": when something happened, to the minute (or to the
// second with withSeconds: "Today, 1:05:12 pm").
export const formatRelativeDateTime = (
  value: DateInput,
  { now = new Date(), fallback = "—", t = inEnglish, locale, withSeconds = false }: RelativeDateOptions & { withSeconds?: boolean } = {},
): string => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const day = toDateInputValue(value);
  if (!day) {
    return fallback;
  }
  const today = toDateInputValue(now);
  const time = formatDate(value, withSeconds ? "h:mm:ss aaa" : "h:mm aaa", fallback, locale);
  if (day === today) return t("Today, {time}", { time });
  if (day === dayBefore(today)) return t("Yesterday, {time}", { time });
  return `${formatDate(value, day.slice(0, 4) === today.slice(0, 4) ? "d MMM" : "d MMM yyyy", fallback, locale)}, ${time}`;
};

// "Today, 2:48 pm", "Yesterday, 5:10 pm", then "28 Sep": the time while it
// is recent, the day once it is older.
export const formatRecentDateTime = (value: DateInput, options: RelativeDateOptions = {}): string => {
  const day = toDateInputValue(value);
  if (!day) {
    return options.fallback ?? "—";
  }
  const today = toDateInputValue(options.now ?? new Date());
  return day === today || day === dayBefore(today) ? formatRelativeDateTime(value, options) : formatRelativeDay(value, options);
};

// "Today", "Yesterday", "28 Sep" or "2 Jun 2025": just the day.
export const formatDayName = (value: DateInput, options: RelativeDateOptions = {}): string => {
  const day = toDateInputValue(value);
  if (!day) {
    return options.fallback ?? "—";
  }
  return day === toDateInputValue(options.now ?? new Date()) ? (options.t ?? inEnglish)("Today") : formatRelativeDay(value, options);
};

// "2:48 pm" while it is today, else "Yesterday, 6:55 pm" or
// "27 Sep, 1:03 pm": a log row's time, short enough for a narrow column.
export const formatLogTime = (value: DateInput, options: RelativeDateOptions = {}): string => {
  const day = toDateInputValue(value);
  if (!day) {
    return options.fallback ?? "—";
  }
  return day === toDateInputValue(options.now ?? new Date()) ? formatDate(value, "h:mm aaa", options.fallback, options.locale) : formatRelativeDateTime(value, options);
};

// "2:43 – 2:47 pm", "11:50 am – 12:10 pm", "Yesterday, 7:30 – 7:42 pm":
// when a burst of tries began and ended. A single minute reads as one time.
export const formatTimeRange = (from: DateInput, to: DateInput, options: RelativeDateOptions = {}): string => {
  const fromDay = toDateInputValue(from);
  const toDay = toDateInputValue(to);
  if (!fromDay || !toDay) {
    return options.fallback ?? "—";
  }
  if (fromDay !== toDay) {
    return `${formatLogTime(from, options)} – ${formatLogTime(to, options)}`;
  }
  const start = formatDate(from, "h:mm aaa", options.fallback, options.locale);
  const end = formatDate(to, "h:mm aaa", options.fallback, options.locale);
  if (start === end) {
    return formatLogTime(from, options);
  }
  const prefix = fromDay === toDateInputValue(options.now ?? new Date()) ? "" : `${formatRelativeDay(from, options)}, `;
  // One am/pm when both share it. Compared in English: পূর্বাহ্ণ and অপরাহ্ণ
  // end in the same letters.
  const samePeriod = formatDate(from, "a") === formatDate(to, "a");
  return `${prefix}${samePeriod ? formatDate(from, "h:mm", options.fallback, options.locale) : start} – ${end}`;
};
