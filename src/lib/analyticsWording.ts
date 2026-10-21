import type { AnalyticsRange } from "./analyticsRange";
import { formatDate } from "./date";
import { banglaDayMonth } from "./i18n/banglaDates";
import { toLocaleDigits } from "./i18n/digits";
import { inEnglish, type Translate } from "./i18n/message";
import type { Locale } from "./i18n/translate";
import { formatNumber } from "./number";

// Days are calendar dates, so they are read at noon UTC (no shifting). A
// Bangla reader gets the board's own short months ("২ সেপ্টে").
const dayLabel = (day: string, locale: Locale) => (locale === "bn" ? banglaDayMonth(day) : formatDate(`${day}T12:00:00Z`, "d MMM"));

// "2 Sep – 1 Oct": the window the charts cover, in the reader's language.
export const rangeSpan = (range: Pick<AnalyticsRange, "from" | "to">, locale: Locale = "en") => `${dayLabel(range.from, locale)} – ${dayLabel(range.to, locale)}`;

// "Last 30 days", or the span of a custom range, in the reader's digits.
export const rangeName = (range: AnalyticsRange, t: Translate = inEnglish, locale: Locale = "en") =>
  range.preset === "custom" ? rangeSpan(range, locale) : t("Last {count} days", { count: toLocaleDigits(range.preset, locale) });

// "60% of all 1,272 accounts"
export const shareOfAccounts = (active: number, total: number, t: Translate = inEnglish) =>
  total > 0 ? t("{percent}% of all {total} accounts", { percent: Math.round((active / total) * 100), total: formatNumber(total) }) : t("No accounts yet");

// "+9 on the week before", "−3 on the week before", "Same as the week before"
export const weekChange = (current: number, previous: number, t: Translate = inEnglish): { text: string; tone: "up" | "down" | "same" } => {
  const difference = current - previous;
  if (difference === 0) return { text: t("Same as the week before"), tone: "same" };
  const change = `${difference > 0 ? "+" : "−"}${formatNumber(Math.abs(difference))}`;
  return { text: t("{change} on the week before", { change }), tone: difference > 0 ? "up" : "down" };
};

// "35% of the weekly number"
export const shareOfWeek = (day: number, week: number, t: Translate = inEnglish) =>
  week > 0 ? t("{percent}% of the weekly number", { percent: Math.round((day / week) * 100) }) : t("Nobody this week");

// How many months after a cohort's own month ("2026-08") a month is: 0 for
// the month they joined.
export const monthsAfter = (cohortMonth: string, month: string) => {
  const [fromYear, fromMonth] = cohortMonth.split("-").map(Number);
  const [toYear, toMonth] = month.split("-").map(Number);
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
};
