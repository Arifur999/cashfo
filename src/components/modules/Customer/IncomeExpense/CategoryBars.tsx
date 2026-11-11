"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import Card from "@/components/smartly/Card";
import type { CategoryBreakdown, CategoryBreakdownRow } from "@/lib/customer/api";
import { ieCategoryColor, ieCategoryInk } from "@/lib/customer/categoryTone";
import { formatCurrency } from "@/lib/customer/currency";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { plural } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { categoryName, donutGradient, oneDecimal } from "./ieFigures";

interface CategoryBarsProps {
  id: string;
  title: string;
  // The donut's middle: "Total income" or "Total expense".
  totalLabel: string;
  // "All income ›": every transaction of the kind in the period.
  viewAll: { label: string; href: string };
  breakdown: CategoryBreakdown;
  currency: string;
  // The total's colour: income green, expense red.
  tone: "income" | "expense";
  emptyText: string;
  // A category's transactions in the period.
  hrefFor: (row: CategoryBreakdownRow) => string;
}

// One kind's categories (the IEOverview board): a donut of their shares
// with the total in its middle, then each category biggest first with how
// many transactions it has, its amount, its share and a bar of that share
// in the category's own colour, each opening its transactions.
export function CategoryBars({ id, title, totalLabel, viewAll, breakdown, currency, tone, emptyText, hrefFor }: CategoryBarsProps) {
  const { t, fmt } = useLocale();
  const rows = [...breakdown.categories].sort((a, b) => Number(b.amount) - Number(a.amount));
  const total = Number(breakdown.total);
  const totalText = formatCurrency(breakdown.total, currency, fmt);
  const pie = donutGradient(
    rows.map((row) => ({ amount: Number(row.amount), color: ieCategoryColor(row.uncategorised ? null : row.color) })),
    total,
    "var(--line-strong)",
    "var(--surface-sunken)",
  );
  // The donut's total: the board's deeper green and red.
  const toneText = tone === "income" ? "text-tint-green-ink" : "text-expense";
  return (
    <Card padding="none" className="overflow-hidden" aria-labelledby={id} role="region">
      <div className="flex items-center justify-between gap-3 border-b border-divider px-5 py-4">
        <h2 id={id} className="text-title font-semibold text-ink">
          {title}
        </h2>
        <Link href={viewAll.href} className="flex items-center gap-1 rounded-sm text-small font-semibold whitespace-nowrap text-emerald hover:underline">
          {viewAll.label}
          <ChevronRight className="size-3.25" strokeWidth={2.5} aria-hidden="true" />
        </Link>
      </div>
      <div className="flex justify-center px-5 pt-6 pb-5">
        <div role="img" aria-label={t("{title} pie chart", { title })} className="relative size-50 rounded-full" style={{ background: pie }}>
          <div className="absolute inset-9.5 flex flex-col items-center justify-center gap-0.5 rounded-full bg-surface text-center">
            <span className="text-caption text-ink-muted">{totalLabel}</span>
            <span className={cn("px-1 text-[18px] font-bold tabular-nums", toneText)}>{totalText}</span>
          </div>
        </div>
      </div>
      <div className="border-t border-divider px-5 pt-3.5">
        <span className="text-caption font-semibold tracking-[0.04em] text-ink-muted uppercase">{t("Category details")}</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 pt-6 pb-7.5 text-body text-ink-muted">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-0.5 px-2.5 pt-2 pb-3.5">
          {rows.map((row) => {
            const share = total > 0 ? (Number(row.amount) / total) * 100 : 0;
            const color = ieCategoryInk(row.uncategorised ? null : row.color);
            const name = categoryName(row, t);
            return (
              <li key={`${row.uncategorised ? "-" : ""}${row.name}`}>
                <Link href={hrefFor(row)} title={t("See these transactions")} className="group flex flex-col gap-2 rounded-md p-2.5 hover:bg-hover focus-visible:bg-hover in-data-[compact=true]:gap-1.5 in-data-[compact=true]:py-1.5">
                  <span className="flex items-center gap-2.5 text-body">
                    <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full bg-current", color)} />
                    <span className="min-w-0 flex-1 truncate font-medium text-ink">{name}</span>
                    {row.count !== undefined && <span className="shrink-0 text-caption text-ink-muted tabular-nums">{plural(t, row.count, "{count} entry", "{count} entries", undefined, fmt)}</span>}
                    <span className="shrink-0 font-semibold text-ink tabular-nums">{formatCurrency(row.amount, currency, fmt)}</span>
                    <span className="w-13 shrink-0 text-right text-ink-muted tabular-nums">{toLocaleDigits(`${oneDecimal(share)}%`, fmt)}</span>
                    <ChevronRight className="size-3.5 shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" strokeWidth={2.25} aria-hidden="true" />
                  </span>
                  <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                    <span className={cn("block h-full rounded-full bg-current", color)} style={{ width: `${Math.min(100, share)}%` }} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
