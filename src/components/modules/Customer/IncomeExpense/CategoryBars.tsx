"use client";

import Card from "@/components/smartly/Card";
import type { CategoryBreakdown } from "@/lib/customer/api";
import { categoryTone } from "@/lib/customer/categoryTone";
import { formatCurrency } from "@/lib/customer/currency";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { formatPercent } from "@/lib/number";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface CategoryBarsProps {
  id: string;
  title: string;
  breakdown: CategoryBreakdown;
  currency: string;
  // The total's colour: income green, expense red.
  tone: "income" | "expense";
  emptyText: string;
}

// One kind's categories, biggest first, each with its amount, its share
// and a bar of that share in the category's own colour.
export function CategoryBars({ id, title, breakdown, currency, tone, emptyText }: CategoryBarsProps) {
  const { t, fmt } = useLocale();
  const rows = [...breakdown.categories].sort((a, b) => Number(b.amount) - Number(a.amount));
  return (
    <Card padding="none" className="overflow-hidden" aria-labelledby={id} role="region">
      <div className="flex items-center justify-between gap-3 border-b border-divider px-5 py-4">
        <h2 id={id} className="text-title font-semibold text-ink">
          {title}
        </h2>
        <span className={cn("text-body font-bold tabular-nums", tone === "income" ? "text-income" : "text-expense")}>{formatCurrency(breakdown.total, currency, fmt)}</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-small text-ink-muted">{t(emptyText)}</p>
      ) : (
        <ul className="flex flex-col gap-4 px-5 pt-4.5 pb-5">
          {rows.map((row) => {
            const share = Math.max(0, Math.min(100, row.percent));
            const color = categoryTone(row.color).fg;
            return (
              <li key={row.name} className="flex flex-col gap-2">
                <span className="flex items-center gap-2.5 text-body">
                  <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full bg-current", color)} />
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">{row.name}</span>
                  <span className="font-semibold text-ink tabular-nums">{formatCurrency(row.amount, currency, fmt)}</span>
                  <span className="w-13 text-right text-ink-muted tabular-nums">{toLocaleDigits(formatPercent(row.percent), fmt)}</span>
                </span>
                <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                  <span className={cn("block h-full rounded-full bg-current", color)} style={{ width: `${share}%` }} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
