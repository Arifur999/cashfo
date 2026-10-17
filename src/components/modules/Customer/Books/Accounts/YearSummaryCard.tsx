"use client";

import Card from "@/components/smartly/Card";
import type { YearRow } from "@/lib/customer/booksDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface YearSummaryCardProps {
  title: string;
  description: string;
  rows: YearRow[];
  total: number;
  currency: string;
}

// This year's income or expenses by account, largest first, with the total.
export function YearSummaryCard({ title, description, rows, total, currency }: YearSummaryCardProps) {
  const { t } = useLocale();
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
            <b className="tabular-nums text-ink">{formatCurrency(total, currency)}</b>
          </div>
        </div>
      )}
    </Card>
  );
}
