"use client";

import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { monthName, type MonthRate, percentLabel, type RateTrend } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { type Locale, useLocale } from "@/lib/i18n/LocaleProvider";
import { plural, type Translate } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";

const HEIGHT = 180;
// The percent label and its gap sit above each bar inside the column, so
// the bars, the gridlines and the axis all share the height below it.
const LABEL_ROOM = 24;
const PLOT = HEIGHT - LABEL_ROOM;

interface SavingsRateChartProps {
  rates: MonthRate[];
  trend: RateTrend | null;
  // The month under way: its salary is in but not all of its spending, so
  // its rate usually runs high until it is over.
  partialMonth: string | null;
}

// "Sep: up 9 points since May", "Sep: down …", or "Sep: same as May". It
// names the month it judges (the last finished one), as the tile above may
// say the month under way is up while that month is down.
function trendText(trend: RateTrend, t: Translate, locale: Locale): string {
  const values = { latest: monthName(trend.until, locale, "short"), month: monthName(trend.since, locale, "short"), points: formatCount(trend.points, locale) };
  if (trend.direction === "same") return t("{latest}: same as {month}", values);
  if (trend.direction === "up") return plural(t, trend.points, "{latest}: up {points} point since {month}", "{latest}: up {points} points since {month}", values, locale);
  return plural(t, trend.points, "{latest}: down {points} point since {month}", "{latest}: down {points} points since {month}", values, locale);
}

// "Am I saving more?": the share of income kept, one bar a month for the
// last six months. The last finished month is in full emerald, as the trend
// beside it reads finished months only; the month under way is drawn faint
// and named "so far".
export function SavingsRateChart({ rates, trend, partialMonth }: SavingsRateChartProps) {
  const { t, locale } = useLocale();
  const axisMax = rates.some((r) => (r.rate ?? 0) > 50) ? 100 : 50;
  const finished = rates.filter((r) => r.month !== partialMonth);
  const latest = finished[finished.length - 1];
  const height = (rate: number) => Math.round((rate / axisMax) * PLOT);
  const shortName = (r: MonthRate) => (r.month === partialMonth ? t("{month} so far", { month: monthName(r.month, locale, "short") }) : monthName(r.month, locale, "short"));
  // The figures for a screen reader, which reads the chart as one image.
  const figures = rates.map((r) => `${shortName(r)} ${r.rate === null ? "—" : percentLabel(r.rate, locale)}`).join(", ");

  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-h3 text-ink">{t("Am I saving more?")}</h2>
          <span className="text-small text-ink-muted">{t("Share of income you kept, each month")}</span>
        </div>
        {trend && <Chip tone={trend.direction === "up" ? "income" : trend.direction === "down" ? "expense" : "neutral"}>{trendText(trend, t, locale)}</Chip>}
      </div>

      <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-2">
        <div aria-hidden="true" className="relative text-right text-caption font-normal text-ink-muted tabular-nums" style={{ height: HEIGHT }}>
          <span className="absolute right-0" style={{ top: LABEL_ROOM - 8 }}>
            {percentLabel(axisMax, locale)}
          </span>
          <span className="absolute right-0" style={{ top: LABEL_ROOM + PLOT / 2 - 8 }}>
            {percentLabel(axisMax / 2, locale)}
          </span>
          <span className="absolute right-0 -bottom-2">{formatCount(0, locale)}</span>
        </div>
        <div role="img" aria-label={t("Share of income kept by month: {months}", { months: figures })} className="relative grid items-end border-b border-line" style={{ height: HEIGHT, gridTemplateColumns: `repeat(${rates.length}, minmax(0, 1fr))` }}>
          <span aria-hidden="true" className="absolute inset-x-0 h-px bg-chart-grid" style={{ top: LABEL_ROOM }} />
          <span aria-hidden="true" className="absolute inset-x-0 h-px bg-chart-grid" style={{ top: LABEL_ROOM + PLOT / 2 }} />
          {rates.map((point) => {
            const current = point === latest;
            // A month that spent more than came in kept 0%: its figure goes red.
            const overspent = point.income > 0 && point.kept < 0;
            const bar = point.rate === null || point.rate === 0 ? 0 : Math.max(2, height(point.rate));
            return (
              <div key={point.month} className="relative flex flex-col items-center gap-2">
                {/* Over the gridlines, on the card's own colour, so a line at its height doesn't strike it through. */}
                <span className={cn("relative z-1 rounded-sm bg-surface px-1 text-caption font-bold tabular-nums", overspent ? "text-expense" : current ? "text-ink" : "text-ink-muted")}>{point.rate === null ? "—" : percentLabel(point.rate, locale)}</span>
                <span className={cn("w-10 rounded-t-md", current ? "bg-emerald" : "bg-mint-300", point.month === partialMonth && "opacity-60")} style={{ height: bar }} />
              </div>
            );
          })}
        </div>
        <span />
        <div aria-hidden="true" className="grid text-center text-caption" style={{ gridTemplateColumns: `repeat(${rates.length}, minmax(0, 1fr))` }}>
          {rates.map((point) => (
            <span key={point.month} className={point === latest ? "font-bold text-ink" : "font-medium text-ink-muted"}>
              {monthName(point.month, locale, "short")}
            </span>
          ))}
        </div>
      </div>
      {/* Says what the faint bar is; the chart's label already does for a screen reader. */}
      {partialMonth && (
        <p aria-hidden="true" className="flex items-center gap-2 text-caption text-ink-muted">
          <span className="size-2.5 shrink-0 rounded-[3px] bg-mint-300 opacity-60" />
          {t("{month} so far", { month: monthName(partialMonth, locale) })}
        </p>
      )}
    </Card>
  );
}
