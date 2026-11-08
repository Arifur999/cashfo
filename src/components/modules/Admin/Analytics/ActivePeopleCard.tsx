"use client";

import { calendarDay } from "@/components/modules/Admin/Dashboard/dashboardDates";
import T from "@/components/shared/T";
import Card from "@/components/smartly/Card";
import { formatMonthKey } from "@/lib/date";
import { banglaMonthShort, toBanglaDigits } from "@/lib/i18n/banglaDates";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import type { IEngagementMonth, IEngagementPoint } from "@/types/analytics.types";
import { ChartPlaceholder, ReportError, type ReportQuery, updatingClass } from "./ReportState";

// The chart's height, as the board draws it.
const HEIGHT = 170;

interface Point {
  key: string;
  bar: number;
  line: number;
  tick: string;
  title: string;
}

// "Oct 26" under a month's bar.
const monthTick = (key: string, locale: Locale) => (locale === "bn" ? `${banglaMonthShort(key)} ${toBanglaDigits(key.slice(2, 4))}` : `${formatMonthKey(key, false)} ${key.slice(2, 4)}`);

// A round top for the axis: steps of 10, 50, 100 or 250, an even number of
// them so the middle line lands on one.
export function axisTop(top: number): number {
  const most = Math.max(top, 10);
  const step = most <= 50 ? 10 : most <= 200 ? 50 : most <= 1000 ? 100 : 250;
  let max = Math.ceil((most * 1.06) / step) * step;
  if ((max / step) % 2) max += step;
  return max;
}

interface ActivePeopleCardProps {
  // A bar a month (a year, or more than 62 days) or a bar a day.
  monthly: boolean;
  days: IEngagementPoint[] | undefined;
  months: IEngagementMonth[] | undefined;
  query: ReportQuery;
}

// People active in the period, as the AdminAnalytics board draws it: a bar
// a day (who was active that day) under a line of who was active in the
// seven days up to it -- or, for a year or a long span, a bar a month (an
// average day) under a line of everyone active that month. The last bar is
// darker and the line ends on a dot; three dates run under it.
const ActivePeopleCard = ({ monthly, days, months, query }: ActivePeopleCardProps) => {
  const { translate, locale } = useLocale();
  const count = (value: number) => formatCount(value, locale);
  const points: Point[] = monthly
    ? (months ?? []).map((row) => ({
        key: row.month,
        bar: row.avgDau,
        line: row.mau,
        tick: monthTick(row.month, locale),
        title: translate("{month}: {day} on an average day, {month_total} that month", { month: monthTick(row.month, locale), day: count(row.avgDau), month_total: count(row.mau) }),
      }))
    : (days ?? []).map((row) => ({
        key: row.date,
        bar: row.dau,
        line: row.wau,
        tick: calendarDay(row.date, locale),
        title: translate("{day}: {count} active, {week} in the last 7 days", { day: calendarDay(row.date, locale), count: count(row.dau), week: count(row.wau) }),
      }));
  const hasActivity = points.some((point) => point.bar > 0 || point.line > 0);
  const top = axisTop(Math.max(0, ...points.map((point) => Math.max(point.bar, point.line))));
  const n = points.length;
  const x = (index: number) => ((index + 0.5) / n) * 1000;
  const y = (value: number) => HEIGHT - (value / top) * HEIGHT;
  const path = points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(point.line).toFixed(1)}`).join(" ");
  const last = points[n - 1];
  const ticks = n > 2 ? [points[0], points[Math.floor((n - 1) / 2)], last] : points;

  return (
    <Card aria-busy={query.updating || undefined} className={cn("flex flex-col gap-3 px-5 py-4", updatingClass(query))}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-title text-ink">
          <T>Active people</T>
        </h2>
        <span className="flex flex-wrap gap-3.5 text-[12.5px] leading-[normal] text-ink-2">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0.75 w-4 rounded-xs bg-forest" />
            <T>{monthly ? "In that month" : "In the last 7 days"}</T>
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-mint-200" />
            <T>{monthly ? "Average day" : "That day"}</T>
          </span>
        </span>
      </div>
      {query.status === "pending" ? (
        <ChartPlaceholder className="h-52" />
      ) : query.status === "error" ? (
        <ReportError onRetry={query.retry} />
      ) : hasActivity ? (
        <>
          <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-2">
            <div aria-hidden="true" className="relative text-right text-[11.5px] leading-[normal] text-ink-faint tabular-nums" style={{ height: HEIGHT }}>
              <span className="absolute -top-1.75 right-0">{count(top)}</span>
              <span className="absolute right-0" style={{ top: HEIGHT / 2 - 7 }}>
                {count(top / 2)}
              </span>
              <span className="absolute right-0 -bottom-1.75">{count(0)}</span>
            </div>
            <div
              role="img"
              aria-label={translate(monthly ? "Active people on an average day as bars and in each month as a line" : "Daily active people as bars and weekly active people as a line")}
              className="relative"
              style={{ height: HEIGHT }}
            >
              <span className="absolute inset-x-0 top-0 border-t border-divider" />
              <span className="absolute inset-x-0 border-t border-divider" style={{ top: HEIGHT / 2 }} />
              <span className="absolute inset-x-0 bottom-0 border-t border-divider" />
              <div className={cn("absolute inset-0 flex items-end px-0.5", n > 40 ? "gap-0.5" : n > 16 ? "gap-1" : "gap-2.5")}>
                {points.map((point, index) => (
                  <span key={point.key} title={point.title} className="flex h-full min-w-0 flex-1 items-end justify-center">
                    <span className={cn("w-full max-w-3 rounded-[3px]", index === n - 1 ? "bg-emerald" : "bg-mint-200")} style={{ height: Math.max(1, (point.bar / top) * HEIGHT) }} />
                  </span>
                ))}
              </div>
              <svg width="100%" height={HEIGHT} viewBox={`0 0 1000 ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-0 block overflow-visible">
                <path d={path} fill="none" stroke="var(--forest)" strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
              {last && (
                <span
                  aria-hidden="true"
                  className="absolute -mt-1.5 -ml-1.5 size-2.25 rounded-full border-2 border-surface bg-forest box-content"
                  style={{ left: `${x(n - 1) / 10}%`, top: y(last.line) }}
                />
              )}
            </div>
          </div>
          <div className="flex justify-between pl-11 text-[11.5px] leading-[normal] text-ink-faint">
            {ticks.map((point) => (
              <span key={point.key}>{point.tick}</span>
            ))}
          </div>
        </>
      ) : (
        <p className="py-16 text-center text-small text-ink-muted">
          <T>Nobody signed in during these days.</T>
        </p>
      )}
    </Card>
  );
};

export default ActivePeopleCard;
