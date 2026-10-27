"use client";

import { formatAmount } from "@/lib/currency";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { DashboardPeriod } from "@/types/dashboard.types";
import { calendarDay, monthLabel, shortMonth } from "./dashboardDates";
import { allZero, axisTicks, revenueBarLabel } from "./dashboardFigures";
import { Section, Unavailable } from "./pieces";

const PERIOD_TITLE: Record<DashboardPeriod, string> = { "7d": "Sign-ups, last 7 days", "30d": "Sign-ups, last 30 days", "90d": "Sign-ups, last 90 days" };

// The chart's 150px, less room for a bar's rounded top.
const BAR_MAX = 140;

interface SignupsCardProps {
  period: DashboardPeriod;
  // Oldest first; the last is today, still counting.
  days: { date: string; count: number }[];
  newInPeriod: number;
  newLast7d: number;
}

// New accounts per day over the period: a bar a day in the primary, today's
// (still counting) lighter, five dates under them ending on "Today".
export function SignupsCard({ period, days, newInPeriod, newLast7d }: SignupsCardProps) {
  const { translate, locale } = useLocale();
  const max = Math.max(1, ...days.map((day) => day.count));
  const ticks = axisTicks(days.length);
  const last = days.length - 1;
  const title = translate(PERIOD_TITLE[period]);
  const total = days.reduce((sum, day) => sum + day.count, 0);

  return (
    <Section
      title={title}
      aside={
        <>
          <b className="font-semibold text-ink">{formatCount(newInPeriod, locale)}</b> {translate("new · {count} this week", { count: formatCount(newLast7d, locale) })}
        </>
      }
    >
      <div
        role="img"
        aria-label={translate("Sign-ups each day from {from} to {to}, {count} in total", {
          from: days[0] ? calendarDay(days[0].date, locale) : "—",
          to: days[last] ? calendarDay(days[last].date, locale) : "—",
          count: formatCount(total, locale),
        })}
        className={cn("flex h-37.5 items-end border-b border-line", days.length > 45 ? "gap-px" : days.length > 14 ? "gap-1" : "gap-2")}
      >
        {days.map((day, index) => (
          <span
            key={day.date}
            title={`${calendarDay(day.date, locale)}: ${translate(index === last ? "{count} sign-ups so far" : "{count} sign-ups", { count: formatCount(day.count, locale) })}`}
            className={cn("min-w-0 flex-1 rounded-t-[3px]", index === last ? "bg-mint-300/80" : "bg-emerald")}
            style={{ height: day.count > 0 ? Math.max(2, Math.round((day.count / max) * BAR_MAX)) : 0 }}
          />
        ))}
      </div>
      <div className="-mt-1.5 flex justify-between text-[11.5px] leading-[normal] text-ink-muted">
        {ticks.map((index) => (
          <span key={index} className={cn(index === last && "font-semibold text-ink")}>
            {index === last ? translate("Today") : calendarDay(days[index].date, locale)}
          </span>
        ))}
      </div>
    </Section>
  );
}

interface RevenueCardProps {
  // The six whole months before this one, oldest first.
  months: { month: string; amount: string }[];
  // The newest of them on the one before it.
  changePct: number | null;
}

// Money in for the last six whole months: the newest in full colour, the
// earlier ones muted, each with its amount above it.
export function RevenueCard({ months, changePct }: RevenueCardProps) {
  const { translate, locale } = useLocale();
  const values = months.map((row) => Number(row.amount));
  const max = Math.max(1, ...values);
  const newest = months.at(-1);
  const title = translate("Revenue, last 6 months");

  return (
    <Section
      title={title}
      aside={
        newest && (
          <>
            {monthLabel(newest.month, locale, translate)} <b className="font-semibold text-ink">{formatAmount(newest.amount, undefined, locale)}</b>
            {changePct !== null && <span className={cn("ml-1 font-semibold", changePct < 0 ? "text-expense" : "text-emerald")}>{toLocaleDigits(`${changePct > 0 ? "+" : ""}${changePct}%`, locale)}</span>}
          </>
        )
      }
    >
      {allZero(values) ? (
        <Unavailable>{translate("No revenue yet.")}</Unavailable>
      ) : (
        <>
          <div role="img" aria-label={title} className="flex h-37.5 items-end gap-3.5 border-b border-line px-1.5">
            {months.map((row, index) => {
              const value = values[index];
              return (
                <span key={row.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[11px] leading-[normal] font-semibold whitespace-nowrap text-ink-2 tabular-nums">{toLocaleDigits(revenueBarLabel(value), locale)}</span>
                  <span
                    className={cn("w-full max-w-11.5 rounded-t-[5px]", index === months.length - 1 ? "bg-forest" : "bg-mint-300/70")}
                    style={{ height: value > 0 ? Math.max(2, Math.round((value / max) * 118)) : 0 }}
                  />
                </span>
              );
            })}
          </div>
          <div className="-mt-1.5 flex gap-3.5 px-1.5">
            {months.map((row) => (
              <span key={row.month} className="min-w-0 flex-1 text-center text-[11.5px] leading-[normal] text-ink-muted">
                {shortMonth(row.month, locale)}
              </span>
            ))}
          </div>
        </>
      )}
    </Section>
  );
}
