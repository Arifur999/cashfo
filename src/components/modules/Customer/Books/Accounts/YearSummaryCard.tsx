"use client";

import Card from "@/components/smartly/Card";
import type { MonthlyBreakdown } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface YearSummaryCardProps {
  title: string;
  description: string;
  breakdown: MonthlyBreakdown;
  currency: string;
}

// This year's income or expenses by category, largest first, with the total.
export function YearSummaryCard({ title, description, breakdown, currency }: YearSummaryCardProps) {
  const { t } = useLocale();
  const rows = [...breakdown.rows].filter((row) => Number(row.total) !== 0).sort((a, b) => Number(b.total) - Number(a.total));
  const line = "grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3 text-body sm:grid-cols-[200px_minmax(0,1fr)]";

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-h3 text-ink">{title}</h3>
        <span className="text-small text-ink-muted">{description}</span>
      </div>
      {rows.length === 0 ? (
        <p className="py-3 text-small text-ink-muted">{t("Nothing posted yet this year.")}</p>
      ) : (
        <div className="flex flex-col">
          {rows.map((row) => (
            <div key={row.name} className={`${line} border-b border-surface-sunken`}>
              <span className="truncate text-ink-muted">{row.name}</span>
              <span className="tabular-nums text-ink">{formatCurrency(row.total, currency)}</span>
            </div>
          ))}
          <div className={line}>
            <b className="text-ink">{t("Total")}</b>
            <b className="tabular-nums text-ink">{formatCurrency(breakdown.total, currency)}</b>
          </div>
        </div>
      )}
    </Card>
  );
}
