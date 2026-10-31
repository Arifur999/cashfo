import { formatDay } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";
import type { FormatLocale } from "@/lib/i18n/formatPrefs";
import type { Translate } from "@/lib/i18n/message";
import { groupMonthOf, monthRangeOf, shiftMonth } from "./groupDisplay";

// The period a group page shows, picked from its own dropdown (the v7
// boards put one on each page in place of the header's month picker):
// Today, This week, This month, This year, All time, or a month or a run of
// months. Kept in the address as ?period= (and ?from=/&to= for custom).

export type GroupPeriodKind = "today" | "week" | "month" | "year" | "all" | "custom";

export type GroupPeriod = { kind: Exclude<GroupPeriodKind, "custom"> } | { kind: "custom"; from: string; to: string };

export interface PeriodRange {
  // YYYY-MM-DD, both days in.
  from: string;
  to: string;
}

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

// ?period=, ?from=, ?to= read back, with the page's own choices; anything
// else is the page's default.
export function groupPeriodFrom(query: { period?: unknown; from?: unknown; to?: unknown }, allowed: readonly GroupPeriodKind[], fallback: GroupPeriod = { kind: "month" }): GroupPeriod {
  const kind = typeof query.period === "string" ? query.period : "";
  if (kind === "custom" && allowed.includes("custom") && typeof query.from === "string" && MONTH_KEY.test(query.from)) {
    const to = typeof query.to === "string" && MONTH_KEY.test(query.to) ? query.to : query.from;
    return query.from <= to ? { kind: "custom", from: query.from, to } : { kind: "custom", from: to, to: query.from };
  }
  if (kind !== "custom" && (allowed as readonly string[]).includes(kind)) return { kind: kind as Exclude<GroupPeriodKind, "custom"> };
  return fallback;
}

// The address values for a period (none for the page's default month).
export function periodQuery(period: GroupPeriod): Record<string, string> {
  if (period.kind === "month") return {};
  if (period.kind === "custom") return period.from === period.to ? { period: "custom", from: period.from } : { period: "custom", from: period.from, to: period.to };
  return { period: period.kind };
}

const addDays = (day: string, days: number): string => {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

// The week runs Saturday to Friday, as weeks do in Bangladesh.
export function weekOf(today: string): PeriodRange {
  const weekday = new Date(`${today}T00:00:00.000Z`).getUTCDay();
  const from = addDays(today, -((weekday + 1) % 7));
  return { from, to: addDays(from, 6) };
}

// The days a period covers. Months are the group's own (a month starting on
// the 10th runs 10 Sep to 9 Oct); a year is its twelve group months, January
// to December; All time starts at `firstDay` (the group's first record).
export function periodRange(period: GroupPeriod, today: string, startDay = 1, firstDay?: string | null): PeriodRange {
  const current = groupMonthOf(today, startDay);
  switch (period.kind) {
    case "today":
      return { from: today, to: today };
    case "week":
      return weekOf(today);
    case "month": {
      const { from, to } = monthRangeOf(current, startDay);
      return { from, to };
    }
    case "year": {
      const year = current.slice(0, 4);
      return { from: monthRangeOf(`${year}-01`, startDay).from, to: monthRangeOf(`${year}-12`, startDay).to };
    }
    case "all":
      return { from: firstDay && firstDay < today ? firstDay : monthRangeOf(current, startDay).from, to: monthRangeOf(current, startDay).to };
    case "custom":
      return { from: monthRangeOf(period.from, startDay).from, to: monthRangeOf(period.to, startDay).to };
  }
}

// The group months a range covers, oldest first ("2026-09", "2026-10").
export function monthsIn(range: PeriodRange, startDay = 1): string[] {
  const keys: string[] = [];
  for (let key = groupMonthOf(range.from, startDay); key <= groupMonthOf(range.to, startDay) && keys.length < 240; key = shiftMonth(key, 1)) keys.push(key);
  return keys;
}

const monthText = (key: string, locale: FormatLocale, style: "MMM yyyy" | "MMMM yyyy" | "MMM") => formatDay(`${key}-01`, style, locale);

// The dropdown's words: "Today · 30 Oct 2026", "This week · 24–30 Oct
// 2026", "October 2026", "This year · 2026", "All time", "Sep 2026" or
// "Jun – Sep 2026".
export function periodLabel(period: GroupPeriod, today: string, startDay: number, t: Translate, locale: FormatLocale): string {
  const current = groupMonthOf(today, startDay);
  switch (period.kind) {
    case "today":
      return t("Today · {day}", { day: formatDay(today, "d MMM yyyy", locale) });
    case "week": {
      const { from, to } = weekOf(today);
      const days = from.slice(0, 7) === to.slice(0, 7) ? `${formatDay(from, "d", locale)}–${formatDay(to, "d MMM yyyy", locale)}` : `${formatDay(from, "d MMM", locale)} – ${formatDay(to, "d MMM yyyy", locale)}`;
      return t("This week · {days}", { days });
    }
    case "month":
      return monthText(current, locale, "MMMM yyyy");
    case "year":
      return t("This year · {year}", { year: toLocaleDigits(current.slice(0, 4), locale) });
    case "all":
      return t("All time");
    case "custom":
      if (period.from === period.to) return monthText(period.from, locale, "MMM yyyy");
      return period.from.slice(0, 4) === period.to.slice(0, 4)
        ? `${monthText(period.from, locale, "MMM")} – ${monthText(period.to, locale, "MMM yyyy")}`
        : `${monthText(period.from, locale, "MMM yyyy")} – ${monthText(period.to, locale, "MMM yyyy")}`;
  }
}

// The words a page uses for its period in a sentence or a heading
// ("October 2026", "this year", "Jun – Sep 2026").
export function periodName(period: GroupPeriod, today: string, startDay: number, t: Translate, locale: FormatLocale): string {
  if (period.kind === "today") return t("Today");
  if (period.kind === "week") return t("This week");
  if (period.kind === "year") return toLocaleDigits(groupMonthOf(today, startDay).slice(0, 4), locale);
  return periodLabel(period, today, startDay, t, locale);
}

export const PERIOD_LABELS: Record<Exclude<GroupPeriodKind, "custom">, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  year: "This year",
  all: "All time",
};
