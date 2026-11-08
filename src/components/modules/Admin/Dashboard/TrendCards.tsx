"use client";

import { monthLabel as monthYearLabel, monthOnlyLabel } from "@/components/modules/Customer/Budget/MonthSwitcher";
import { busiest, isThisMonth } from "@/lib/adminPeriod";
import type { Period } from "@/lib/customer/period";
import { formatAmount } from "@/lib/currency";
import { formatDay } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { IDashboardPeriodMoney, IDashboardRange } from "@/types/dashboard.types";
import { calendarDay, shortMonth } from "./dashboardDates";
import { allZero, axisTicks, revenueBarLabel } from "./dashboardFigures";
import { Section, Unavailable } from "./pieces";

// The chart's 150px, less room for a bar's rounded top.
const BAR_MAX = 140;

const monthNumber = (key: string) => Number(key.slice(5, 7));
const yearNumber = (key: string) => Number(key.slice(0, 4));

// A day as a span writes it: "1 Aug 2026".
const fullDay = (day: string, locale: Parameters<typeof formatDay>[2]) => formatDay(day, "d MMM yyyy", locale);

interface SignupsCardProps {
  range: IDashboardRange;
  period: Period;
  // A bar a day or a month, oldest first.
  signups: { unit: "day" | "month"; points: { key: string; count: number }[] };
  newInPeriod: number;
  newLast7d: number;
  today: string;
}

// New accounts in the period, as the AdminDashboard board draws them: a bar
// a day for a month or a short span, a bar a month for a year or a long
// one, the bar still counting (today's) lighter, and five dates under them
// ending on "Today" while the period runs.
export function SignupsCard({ range, period, signups, newInPeriod, newLast7d, today }: SignupsCardProps) {
  const { translate, locale, fmt } = useLocale();
  const { points, unit } = signups;
  const daily = unit === "day";
  const max = Math.max(1, ...points.map((point) => point.count));
  const ticks = axisTicks(points.length);
  const runningKey = daily ? today : today.slice(0, 7);
  const label = (key: string) => (daily ? calendarDay(key, locale) : shortMonth(key, locale));
  const title =
    period.kind === "month"
      ? translate("Sign-ups, {month}", { month: monthYearLabel(period.month, period.year, fmt) })
      : period.kind === "year"
        ? translate("Sign-ups in {year}, by month", { year: toLocaleDigits(String(period.year), locale) })
        : translate("Sign-ups, {from} – {to}", { from: fullDay(range.from, fmt), to: fullDay(range.to, fmt) });
  const best = busiest(points);
  const note = range.isNow
    ? translate("{count} in the last 7 days", { count: formatCount(newLast7d, locale) })
    : best
      ? translate(daily ? "busiest day {day} ({count})" : "busiest month {day} ({count})", { day: label(best.key), count: formatCount(best.count, locale) })
      : translate("none yet");

  return (
    <Section
      title={title}
      aside={
        <>
          <b className="font-semibold text-ink">{formatCount(newInPeriod, locale)}</b> {translate("new · {note}", { note })}
        </>
      }
    >
      <div
        role="img"
        aria-label={translate(daily ? "Sign-ups each day from {from} to {to}, {count} in total" : "Sign-ups each month from {from} to {to}, {count} in total", {
          from: fullDay(range.from, fmt),
          to: fullDay(range.to, fmt),
          count: formatCount(newInPeriod, locale),
        })}
        className={cn("flex h-37.5 items-end border-b border-line", points.length > 31 ? "gap-0.5" : "gap-1")}
      >
        {points.map((point) => {
          const running = point.key === runningKey;
          return (
            <span
              key={point.key}
              title={`${label(point.key)}: ${translate(running ? "{count} sign-ups so far" : "{count} sign-ups", { count: formatCount(point.count, locale) })}`}
              className={cn("min-w-0 flex-1 rounded-t-[3px]", running ? "bg-mint-300/80" : "bg-emerald")}
              style={{ height: Math.max(2, Math.round((point.count / max) * BAR_MAX)) }}
            />
          );
        })}
      </div>
      <div className="-mt-1.5 flex justify-between text-[11.5px] leading-[normal] text-ink-muted">
        {ticks.map((index) => {
          const isToday = daily && points[index].key === today;
          return (
            <span key={index} className={cn(isToday && "font-semibold text-ink")}>
              {isToday ? translate("Today") : label(points[index].key)}
            </span>
          );
        })}
      </div>
    </Section>
  );
}

interface RevenueCardProps {
  range: IDashboardRange;
  period: Period;
  revenue: IDashboardPeriodMoney["revenue"];
  today: string;
}

// Money in, month by month, as the board draws it: the six months to a
// chosen month, or the months of a year or span (twelve at most), the
// period's months dark, each with its amount over it; the head says the
// period's total against the span before.
export function RevenueCard({ range, period, revenue, today }: RevenueCardProps) {
  const { translate, locale, fmt } = useLocale();
  const values = revenue.months.map((row) => Number(row.amount));
  const max = Math.max(1, ...values);
  const highlight = new Set(revenue.highlight);
  const many = revenue.months.length > 6;
  const last = revenue.months.at(-1)?.month ?? today.slice(0, 7);
  const thisMonth = isThisMonth(period, today);
  // "October so far" while it runs, else "October".
  const soFar = (name: string, running: boolean) => (running ? translate("{month} so far", { month: name }) : name);
  const title =
    period.kind === "month"
      ? thisMonth
        ? translate("Revenue, last 6 months")
        : translate("Revenue, 6 months to {month}", { month: monthYearLabel(monthNumber(last), yearNumber(last), fmt) })
      : period.kind === "year"
        ? translate("Revenue in {year}, by month", { year: toLocaleDigits(String(period.year), locale) })
        : translate("Revenue, months in this period");
  const name =
    period.kind === "month"
      ? soFar(monthOnlyLabel(period.month, fmt), thisMonth)
      : period.kind === "year"
        ? soFar(toLocaleDigits(String(period.year), locale), range.isNow)
        : translate("This period");
  const change = revenue.changePct;
  const changeText =
    change === null ? null : change > 300 ? toLocaleDigits(`×${(1 + change / 100).toFixed(1)}`, locale) : toLocaleDigits(`${change < 0 ? "−" : "+"}${Math.abs(change).toFixed(1)}%`, locale);

  return (
    <Section
      title={title}
      aside={
        <>
          {name} <b className="font-semibold text-ink">{formatAmount(revenue.total, undefined, locale)}</b>
          {changeText && <span className={cn("ml-1 font-semibold", change !== null && change < 0 ? "text-expense" : "text-emerald")}>{changeText}</span>}
        </>
      }
    >
      {allZero(values) ? (
        <Unavailable>{translate("No revenue in these months.")}</Unavailable>
      ) : (
        <>
          <div
            role="img"
            aria-label={translate("Revenue each month from {from} to {to}", {
              from: monthYearLabel(monthNumber(revenue.months[0].month), yearNumber(revenue.months[0].month), fmt),
              to: monthYearLabel(monthNumber(last), yearNumber(last), fmt),
            })}
            className={cn("flex h-37.5 items-end border-b border-line px-1.5", many ? "gap-1.5" : "gap-3.5")}
          >
            {revenue.months.map((row, index) => {
              const value = values[index];
              return (
                <span key={row.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <span className={cn("leading-[normal] font-semibold whitespace-nowrap text-ink-2 tabular-nums", many ? "text-[10px]" : "text-[11px]")}>
                    {toLocaleDigits(revenueBarLabel(value, locale, !many), locale)}
                  </span>
                  <span
                    className={cn("w-full max-w-11.5 rounded-t-[5px]", highlight.has(row.month) ? "bg-forest" : "bg-mint-300/70")}
                    style={{ height: value > 0 ? Math.max(2, Math.round((value / max) * 118)) : 0 }}
                  />
                </span>
              );
            })}
          </div>
          <div className={cn("-mt-1.5 flex px-1.5", many ? "gap-1.5" : "gap-3.5")}>
            {revenue.months.map((row) => {
              const strong = period.kind === "month" && highlight.has(row.month);
              return (
                <span key={row.month} className={cn("min-w-0 flex-1 text-center text-[11.5px] leading-[normal] whitespace-nowrap", strong ? "font-semibold text-ink" : "text-ink-muted")}>
                  {shortMonth(row.month, locale)}
                </span>
              );
            })}
          </div>
        </>
      )}
    </Section>
  );
}
