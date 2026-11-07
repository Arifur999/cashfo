"use client";

import Link from "next/link";
import { currencySymbol, formatCompactAmount, formatCurrency } from "@/lib/customer/currency";
import { categoryLabel } from "@/lib/customer/transactionRows";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { categoryChartColor, donutGradient, type DashboardPeriodKey } from "./dashboardFigures";
import { CARD } from "./HomeHero";
import type { HomeData } from "./homeTypes";

// The period's name under the card's title.
const PERIOD_NAME: Record<DashboardPeriodKey, string> = {
  "this-month": "This month",
  "last-month": "Last month",
  "this-year": "This year",
  custom: "This period",
};

// Spending by category: the period's spending as a donut, the biggest
// categories beside it with their amount and share.
export function SpendingCard({ data }: { data: HomeData }) {
  const { t, fmt } = useLocale();
  const { slices, total } = data.spending;
  const empty = slices.length === 0;
  const name = (slice: (typeof slices)[number]) => (slice.color === null && slice.name === "Other" ? t("Other") : categoryLabel(slice.name, t));
  const label = t("Spending by category");
  const describe = slices.map((slice) => `${name(slice)} ${toLocaleDigits(String(slice.percent), fmt)}%`).join(", ");

  return (
    <>
      <section className={cn(CARD, "hidden flex-col gap-5 p-6 md:flex")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-title leading-[normal] font-semibold text-ink">{label}</h2>
            <span className="text-[13px] leading-[normal] text-ink-muted">{data.period.label}</span>
          </div>
          {!empty && (
            <Link href="/income-expense" className="text-[13px] leading-[normal] font-semibold text-emerald hover:text-emerald-hover">
              {t("Details")}
            </Link>
          )}
        </div>
        <div
          role="img"
          aria-label={empty ? t("Nothing spent") : `${label}: ${describe}`}
          className={cn("flex size-44 items-center justify-center self-center rounded-full", empty && "bg-surface-sunken")}
          style={empty ? undefined : { background: donutGradient(slices) }}
        >
          <div className="flex size-31 flex-col items-center justify-center gap-0.5 rounded-full bg-surface">
            <span className={cn("text-[19px] leading-[normal] font-bold tracking-[-0.01em] tabular-nums", empty ? "text-ink-faint" : "text-ink")}>{formatCurrency(total, data.currency, fmt)}</span>
            <span className="text-caption text-ink-muted">{t("Total spent")}</span>
          </div>
        </div>
        {empty ? (
          <div className="flex flex-col items-center gap-1.5 text-center">
            <span className="text-[15px] leading-[normal] font-semibold text-ink">{t(data.period.key === "this-month" ? "No spending this month" : "No spending in this period")}</span>
            <span className="max-w-65 text-[13px] leading-normal text-ink-muted">{t("Your top spending categories will appear here once you add an expense.")}</span>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {slices.map((slice) => (
              <li key={slice.name} className="grid grid-cols-[10px_minmax(0,1fr)_auto_36px] items-center gap-x-2.5 text-[13px] leading-[normal]">
                <span className="size-2.5 rounded-[3px]" style={{ background: categoryChartColor(slice.color) }} />
                <span className="truncate text-ink-2">{name(slice)}</span>
                <span className="font-semibold text-ink tabular-nums">{formatCurrency(slice.amount, data.currency, fmt)}</span>
                <span className="text-right text-ink-muted tabular-nums">{toLocaleDigits(String(slice.percent), fmt)}%</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* The phone board's: a smaller donut, the four biggest beside it. */}
      <section className={cn(CARD, "flex flex-col gap-3.5 p-4 md:hidden")}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-title leading-[normal] font-semibold text-ink">{label}</h2>
          <span className="text-caption text-ink-muted">{t(PERIOD_NAME[data.period.key])}</span>
        </div>
        <div className="flex items-center gap-4">
          <div
            role="img"
            aria-label={empty ? t("Nothing spent") : `${label}: ${describe}`}
            className={cn("flex size-28 shrink-0 items-center justify-center rounded-full", empty && "bg-surface-sunken")}
            style={empty ? undefined : { background: donutGradient(slices) }}
          >
            <div className="flex size-19 flex-col items-center justify-center rounded-full bg-surface">
              <span className={cn("text-[13px] leading-[normal] font-bold tabular-nums", empty ? "text-ink-faint" : "text-ink")}>
                {total > 0 ? `${currencySymbol(data.currency, fmt).trim()} ${formatCompactAmount(total, fmt)}` : formatCurrency(0, data.currency, fmt)}
              </span>
              <span className="text-[10px] leading-[normal] text-ink-muted">{t("spent")}</span>
            </div>
          </div>
          {empty ? (
            <span className="text-[13px] leading-normal text-ink-muted">{t("Your top spending categories will appear here once you add an expense.")}</span>
          ) : (
            <ul className="flex min-w-0 grow flex-col gap-2">
              {slices.slice(0, 4).map((slice) => (
                <li key={slice.name} className="grid grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-x-2 text-caption">
                  <span className="size-2 rounded-[2px]" style={{ background: categoryChartColor(slice.color) }} />
                  <span className="truncate text-ink-2">{name(slice)}</span>
                  <span className="font-semibold text-ink tabular-nums">{toLocaleDigits(String(slice.percent), fmt)}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
