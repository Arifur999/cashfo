"use client";

import Card from "@/components/smartly/Card";
import type { IncomeVsSavingsPoint } from "@/lib/customer/api";
import { formatCompactAmount, formatCurrency } from "@/lib/customer/currency";
import { bestMonthNote } from "@/lib/customer/homeInsights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const HEIGHT = 200;

// Rounds the axis top up to a clean figure (85,000 → 1,00,000; 3,20,000 →
// 4,00,000), so the labels read as whole lakhs or thousands.
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const unit = value / magnitude;
  const step = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10;
  return step * magnitude;
}

interface IncomeSavedChartProps {
  points: IncomeVsSavingsPoint[];
  currency: string;
  monthName: string;
}

// "Income and what you kept": two bars a month for the last six months,
// the current month on a cream band, and a line under it that says how
// this month compares.
export function IncomeSavedChart({ points, currency, monthName }: IncomeSavedChartProps) {
  const { t } = useLocale();
  const max = niceMax(Math.max(...points.map((p) => Math.max(Number(p.income), Number(p.savings))), 0));
  const current = points[points.length - 1];
  const note = bestMonthNote(points);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-h3 text-ink">{t("Income and what you kept")}</h3>
          <span className="text-small text-ink-muted">{t("Last 6 months")}</span>
        </div>
        <span className="flex gap-4 text-caption text-ink-2">
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-[3px] bg-chart-income" />
            {t("Income")}
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-[3px] bg-chart-savings" />
            {t("Saved")}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-2">
        <div className="relative text-right text-caption font-normal text-ink-muted tabular-nums" style={{ height: HEIGHT }}>
          <span className="absolute -top-2 right-0">{formatCompactAmount(max)}</span>
          <span className="absolute right-0" style={{ top: HEIGHT / 2 - 8 }}>
            {formatCompactAmount(max / 2)}
          </span>
          <span className="absolute right-0 -bottom-2">0</span>
        </div>
        <div
          role="img"
          aria-label={t("Income and savings by month")}
          className="grid items-end border-b border-line bg-[linear-gradient(var(--line),var(--line))_0_0/100%_1px_no-repeat,linear-gradient(var(--surface-sunken),var(--surface-sunken))_0_50%/100%_1px_no-repeat]"
          style={{ height: HEIGHT, gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
        >
          {points.map((point) => {
            const isCurrent = point === current;
            const income = Math.round((Number(point.income) / max) * HEIGHT);
            const saved = Math.round((Number(point.savings) / max) * HEIGHT);
            return (
              <div
                key={point.month}
                title={`${point.month}: ${t("income")} ${formatCurrency(point.income, currency)}, ${t("saved")} ${formatCurrency(point.savings, currency)}`}
                className={cn("flex h-full items-end justify-center gap-2 rounded-t-md", isCurrent && "bg-cream")}
              >
                <span className="w-5.5 rounded-t-sm bg-chart-income" style={{ height: income }} />
                <span className="w-5.5 rounded-t-sm bg-chart-savings" style={{ height: saved }} />
              </div>
            );
          })}
        </div>
        <span />
        <div className="grid text-center text-caption" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
          {points.map((point) => (
            <span key={point.month} className={point === current ? "font-bold text-ink" : "font-medium text-ink-muted"}>
              {point.month.split(" ")[0]}
            </span>
          ))}
        </div>
      </div>

      {current && Number(current.savings) > 0 && (
        <p className="rounded-md bg-mint-50 px-4 py-3 text-body text-brand-ink">
          <b>
            {t("You kept")} {formatCurrency(current.savings, currency)} {t("in")} {monthName}
          </b>
          {note?.best ? `, ${t("your best in six months.")}` : note ? `, ${t("behind")} ${note.beatenBy}.` : "."}
        </p>
      )}
    </Card>
  );
}
