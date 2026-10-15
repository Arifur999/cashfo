"use client";

import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { monthName, type MonthRate } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const HEIGHT = 180;
// The percent label and its gap sit above each bar inside the column, so a
// bar is that much shorter than its share of the height.
const LABEL_ROOM = 24;

interface SavingsRateChartProps {
  rates: MonthRate[];
  trend: { up: boolean; points: number; since: string } | null;
}

// "Am I saving more?": the share of income kept, one bar a month for the
// last six months, the latest in full emerald.
export function SavingsRateChart({ rates, trend }: SavingsRateChartProps) {
  const { t, locale } = useLocale();
  const axisMax = rates.some((r) => (r.rate ?? 0) > 50) ? 100 : 50;
  const last = rates[rates.length - 1];

  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-h3 text-ink">{t("Am I saving more?")}</h2>
          <span className="text-small text-ink-muted">{t("Share of income you kept, each month")}</span>
        </div>
        {trend && (
          <Chip tone={trend.up ? "income" : "expense"}>
            {trend.up ? t("Yes") : t("Not yet")} · {t(trend.up ? "up" : "down")} {trend.points} {t(trend.points === 1 ? "point since" : "points since")} {monthName(trend.since, locale, "short")}
          </Chip>
        )}
      </div>

      <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-2">
        <div className="relative text-right text-caption font-normal text-ink-muted tabular-nums" style={{ height: HEIGHT }}>
          <span className="absolute -top-2 right-0">{axisMax}%</span>
          <span className="absolute right-0" style={{ top: HEIGHT / 2 - 8 }}>
            {axisMax / 2}%
          </span>
          <span className="absolute right-0 -bottom-2">0</span>
        </div>
        <div
          role="img"
          aria-label={t("Share of income kept by month")}
          className="grid items-end border-b border-line bg-[linear-gradient(var(--line),var(--line))_0_0/100%_1px_no-repeat,linear-gradient(var(--surface-sunken),var(--surface-sunken))_0_50%/100%_1px_no-repeat]"
          style={{ height: HEIGHT, gridTemplateColumns: `repeat(${rates.length}, minmax(0, 1fr))` }}
        >
          {rates.map((point) => {
            const current = point === last;
            const bar = point.rate === null ? 0 : Math.max(4, Math.round((point.rate / axisMax) * HEIGHT) - LABEL_ROOM);
            return (
              <div key={point.month} className="flex flex-col items-center gap-2">
                <span className={cn("text-caption font-bold tabular-nums", current ? "text-ink" : "text-ink-muted")}>{point.rate === null ? "—" : `${point.rate}%`}</span>
                <span className={cn("w-10 rounded-t-md", current ? "bg-emerald" : "bg-mint-300")} style={{ height: bar }} />
              </div>
            );
          })}
        </div>
        <span />
        <div className="grid text-center text-caption" style={{ gridTemplateColumns: `repeat(${rates.length}, minmax(0, 1fr))` }}>
          {rates.map((point) => (
            <span key={point.month} className={point === last ? "font-bold text-ink" : "font-medium text-ink-muted"}>
              {monthName(point.month, locale, "short")}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}
