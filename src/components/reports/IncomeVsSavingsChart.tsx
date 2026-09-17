"use client";

import type { IncomeVsSavingsPoint } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface IncomeVsSavingsChartProps {
  points: IncomeVsSavingsPoint[];
  currency: string;
}

const BAR_MAX_HEIGHT = 180;

// Hand-rolled grouped bar chart (no charting library in this app -- same
// "build it ourselves" convention as DatePicker/Combobox/ProgressRing) --
// two bars per month (Income, Savings), scaled against the single largest
// value across the whole range so bars stay comparable month to month.
export function IncomeVsSavingsChart({ points, currency }: IncomeVsSavingsChartProps) {
  const { t } = useLocale();
  const maxValue = Math.max(1, ...points.flatMap((p) => [Number(p.income), Number(p.savings)]));

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">{t("Income vs Savings")}</h2>
        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand-dark" /> {t("Income")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand-primary/50" /> {t("Savings")}
          </span>
        </div>
      </div>

      {points.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-400">{t("No data yet.")}</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex min-w-[480px] items-end gap-4 sm:gap-6" style={{ height: BAR_MAX_HEIGHT + 32 }}>
            {points.map((p) => {
              const incomeHeight = Math.round((Number(p.income) / maxValue) * BAR_MAX_HEIGHT);
              const savingsHeight = Math.round((Number(p.savings) / maxValue) * BAR_MAX_HEIGHT);
              return (
                <div key={p.month} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                  <div className="flex items-end gap-1" style={{ height: BAR_MAX_HEIGHT }}>
                    <div
                      title={`${t("Income")}: ${formatCurrency(p.income, currency)}`}
                      className="w-4 rounded-t-sm bg-brand-dark sm:w-6"
                      style={{ height: Math.max(2, incomeHeight) }}
                    />
                    <div
                      title={`${t("Savings")}: ${formatCurrency(p.savings, currency)}`}
                      className="w-4 rounded-t-sm bg-brand-primary/50 sm:w-6"
                      style={{ height: Math.max(2, savingsHeight) }}
                    />
                  </div>
                  <span className="whitespace-nowrap text-xs text-neutral-400">{p.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
