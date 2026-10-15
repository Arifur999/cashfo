"use client";

import Card from "@/components/smartly/Card";
import { formatCurrency } from "@/lib/customer/currency";
import { monthName, type MonthRate } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const HEIGHT = 120;

interface KeptChartProps {
  rates: MonthRate[];
  currency: string;
}

// The phone's "Income and what you kept": two thin bars a month, income in
// emerald and what was kept in mint, over the last six months.
export function KeptChart({ rates, currency }: KeptChartProps) {
  const { t, locale } = useLocale();
  const max = Math.max(...rates.map((r) => r.income), 1);
  const last = rates[rates.length - 1];

  return (
    <Card padding="sm" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-h3 text-ink">{t("Income and what you kept")}</h3>
        <span className="text-small text-ink-muted">{t("Last 6 months")}</span>
      </div>
      <div role="img" aria-label={t("Income and what you kept, by month")} className="flex gap-1">
        {rates.map((point) => (
          <div key={point.month} title={`${monthName(point.month, locale, "short")}: ${formatCurrency(point.income, currency)} ${t("in")}, ${formatCurrency(Math.max(0, point.kept), currency)} ${t("kept")}`} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-end justify-center gap-0.75" style={{ height: HEIGHT }}>
              <span className="w-3 rounded-t-sm bg-emerald" style={{ height: Math.round((point.income / max) * HEIGHT) }} />
              <span className="w-3 rounded-t-sm bg-mint-300" style={{ height: Math.round((Math.max(0, point.kept) / max) * HEIGHT) }} />
            </div>
            <span className={cn("text-caption", point === last ? "font-bold text-ink" : "font-normal text-ink-muted")}>{monthName(point.month, locale, "short")}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-caption font-normal text-ink-muted">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-[3px] bg-emerald" />
          {t("Income")}
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-[3px] bg-mint-300" />
          {t("Kept")}
        </span>
      </div>
    </Card>
  );
}
