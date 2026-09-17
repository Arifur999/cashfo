"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { CategoryBreakdown, IncomeVsSavingsPoint } from "@/lib/api";
import type { DateRangePreset } from "@/lib/dateRangePresets";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CategoryDonutCard } from "./CategoryDonutCard";
import { IncomeVsSavingsChart } from "./IncomeVsSavingsChart";

interface ReportsOverviewPageClientProps {
  income: CategoryBreakdown;
  expense: CategoryBreakdown;
  trend: IncomeVsSavingsPoint[];
  currency: string;
  range: DateRangePreset;
  customFrom?: string;
  customTo?: string;
}

// "This Month" first and the default (see page.tsx) -- every other list
// page in this app defaults to "All Time"; this one deliberately doesn't,
// per the user's explicit request.
const RANGE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "this-year", label: "This Year" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom" },
];

export function ReportsOverviewPageClient({ income, expense, trend, currency, range, customFrom, customTo }: ReportsOverviewPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/reports/overview?${params.toString()}`);
  }

  function setRange(value: DateRangePreset) {
    if (value === "custom") updateParams({ range: value });
    else updateParams({ range: value, dateFrom: undefined, dateTo: undefined });
  }

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("Financial Reports")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("Analyze your financial data and trends.")}</p>
        </div>
        <div>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as DateRangePreset)}
            className="rounded-xl border border-neutral-200 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-primary"
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.label)}
              </option>
            ))}
          </select>
          {range === "custom" && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="date"
                value={customFrom ?? ""}
                onChange={(e) => updateParams({ dateFrom: e.target.value })}
                className="rounded-xl border border-neutral-200 bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand-primary"
              />
              <span className="text-sm text-neutral-400">{t("to")}</span>
              <input
                type="date"
                value={customTo ?? ""}
                onChange={(e) => updateParams({ dateTo: e.target.value })}
                className="rounded-xl border border-neutral-200 bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand-primary"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CategoryDonutCard title="Income by Category" breakdown={income} currency={currency} totalLabel="Total Income" />
        <CategoryDonutCard title="Expense by Category" breakdown={expense} currency={currency} totalLabel="Total Expenses" />
      </div>

      <div className="mt-4">
        <IncomeVsSavingsChart points={trend} currency={currency} />
      </div>
    </div>
  );
}
