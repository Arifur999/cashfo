"use client";

import { ChartColumn, Plus } from "lucide-react";
import { useId, useState } from "react";
import { formatCompactAmount, formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { withLocale, redigit } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { quarterAxis } from "./dashboardFigures";
import { CARD } from "./HomeHero";
import type { HomeChartPoint } from "./homeTypes";

interface IncomeExpenseChartProps {
  points: HomeChartPoint[];
  currency: string;
  // Opens the transaction drawer, from the empty chart's button (only for
  // someone who may post).
  onAdd?: () => void;
}

// A dashed rule across the plot, under the bars.
const RULE = "pointer-events-none absolute inset-x-0 border-t border-dashed border-line";
// The empty chart's grey bars, as the board draws them.
const GHOST = [
  [36, 30],
  [55, 28],
  [48, 38],
  [62, 33],
  [65, 40],
  [66, 42],
];

function Legend({ size }: { size: "md" | "sm" }) {
  const { t } = useLocale();
  const dot = cn("shrink-0", size === "md" ? "size-2.5 rounded-[3px]" : "size-2 rounded-[2px]");
  return (
    <div aria-hidden="true" className={cn("flex text-ink-soft", size === "md" ? "gap-4 text-[13px]" : "gap-2.5 text-caption")}>
      <span className={cn("flex items-center", size === "md" ? "gap-1.5" : "gap-1")}>
        <span className={cn(dot, "bg-chart-income")} />
        {t("Income")}
      </span>
      <span className={cn("flex items-center", size === "md" ? "gap-1.5" : "gap-1")}>
        <span className={cn(dot, size === "md" ? "bg-chart-expense" : "bg-chart-expense/60")} />
        {t("Expense")}
      </span>
    </div>
  );
}

// Income vs Expense: two bars a month for the last six months, the current
// month in full colour on a band and the earlier ones muted. Hovering (or
// focusing) a month shows its figures and what was saved.
export function IncomeExpenseChart({ points, currency, onAdd }: IncomeExpenseChartProps) {
  const { t, fmt } = useLocale();
  const listId = useId();
  const [active, setActive] = useState<number | null>(null);
  const top = Math.max(0, ...points.map((p) => Math.max(p.income, p.expense)));
  const axis = quarterAxis(top);
  const money = (value: number) => formatCurrency(value, currency, fmt);
  // The figures in the reader's digits, the units in the reader's words: a
  // Bangla unit is a whole word ("৫০ হাজার"), so it gets a space. Lakh and
  // crore, or million and billion for a reader who groups in threes.
  // The board writes every tick in the top tick's unit with a space ("2 L",
  // "0.5 L"), so a lakh-scale chart never mixes in "50K".
  const lakhScale = (typeof fmt === "string" || fmt.grouping === "lakh") && axis !== null && axis[0] >= 100000 && axis[0] < 10000000;
  const axisLabel = (value: number) =>
    lakhScale
      ? toLocaleDigits(`${Number((value / 100000).toFixed(2))} ${t("L@@axis")}`, fmt)
      : toLocaleDigits(formatCompactAmount(value, withLocale(fmt, "en")).replace(/(Cr|L|K|M|B)$/, (unit) => ` ${t(`${unit}@@axis`)}`), fmt);
  const describe = (p: HomeChartPoint) => t("{month}: income {income}, expense {expense}", { month: p.name, income: money(p.income), expense: money(p.expense) });
  const current = points.length - 1;
  const shown = active !== null ? points[active] : null;

  const header = (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-title leading-[normal] font-semibold text-ink">{t("Income vs Expense")}</h2>
        <span className="text-[13px] leading-[normal] text-ink-muted">{redigit(t("Last 6 months"), fmt)}</span>
      </div>
      {axis && <Legend size="md" />}
    </div>
  );

  if (!axis) {
    return (
      <section className={cn(CARD, "flex flex-col gap-5 p-4 md:p-6 xl:col-span-2")}>
        {header}
        <div className="relative">
          <div aria-hidden="true" className="flex h-75 items-end justify-around border-b border-line">
            {GHOST.map(([a, b], i) => (
              <div key={i} className="flex h-full items-end gap-1.5">
                <div className="w-4.5 rounded-t-[4px] bg-surface-sunken" style={{ height: `${a}%` }} />
                <div className="w-4.5 rounded-t-[4px] bg-surface-sunken" style={{ height: `${b}%` }} />
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 top-15 flex h-55 flex-col items-center justify-center gap-2 text-center">
            <span className="flex size-12 items-center justify-center rounded-md bg-emerald-soft text-emerald">
              <ChartColumn className="size-5.5" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="text-[15px] leading-[normal] font-semibold text-ink">{t("No income or expenses yet")}</span>
            <span className="max-w-85 text-[13px] leading-normal text-ink-muted">{t("Add a transaction and your monthly trend will show up here.")}</span>
            {onAdd && (
              <button type="button" onClick={onAdd} className="mt-1.5 flex h-9 items-center gap-1.5 rounded-full border border-input bg-surface px-3.5 text-[13px] font-semibold text-ink hover:bg-surface-sunken">
                <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                {t("Add transaction")}
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  const height = (value: number) => `${(Math.max(0, value) / axis[0]) * 100}%`;

  return (
    <>
      <section className={cn(CARD, "hidden flex-col gap-5 p-6 md:flex xl:col-span-2")}>
        {header}
        <div className="flex min-h-85 grow gap-3">
          {/* Bangla's axis words ("৫০ হাজার") need a wider column. */}
          <div aria-hidden="true" className="-mt-2 flex w-10 flex-col justify-between pb-5 text-right text-caption whitespace-nowrap text-ink-muted tabular-nums [.font-bn_&]:w-14">
            {axis.map((value, i) => (
              <span key={i}>{value === 0 ? toLocaleDigits("0", fmt) : axisLabel(value)}</span>
            ))}
          </div>
          <div className="flex grow flex-col">
            <div role="img" aria-label={t("Income and expense, by month")} aria-describedby={listId} className="relative grow">
              <span aria-hidden="true" className={cn(RULE, "top-0")} />
              <span aria-hidden="true" className={cn(RULE, "top-1/4")} />
              <span aria-hidden="true" className={cn(RULE, "top-1/2")} />
              <span aria-hidden="true" className={cn(RULE, "top-3/4")} />
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 border-t border-input" />
              <div className="absolute inset-0 flex items-end justify-around" onMouseLeave={() => setActive(null)}>
                {points.map((point, i) => {
                  const now = i === current;
                  return (
                    <button
                      key={point.month}
                      type="button"
                      aria-label={describe(point)}
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                      className={cn("flex h-full w-21 cursor-default items-end justify-center gap-1 rounded-t-lg outline-none focus-visible:ring-2 focus-visible:ring-focus-ring", now && "bg-surface-sunken")}
                    >
                      <span className={cn("w-6.5 rounded-[8px_8px_4px_4px]", now ? "bg-chart-income" : "bg-chart-income/45")} style={{ height: height(point.income) }} />
                      <span className={cn("w-6.5 rounded-[8px_8px_4px_4px]", now ? "bg-chart-expense" : "bg-chart-expense/40")} style={{ height: height(point.expense) }} />
                    </button>
                  );
                })}
              </div>
              {shown && active !== null && <ChartTip point={shown} currency={currency} index={active} count={points.length} />}
            </div>
            <div aria-hidden="true" className="flex h-7 items-end justify-around">
              {points.map((point, i) => (
                <span key={point.month} className={cn("w-21 text-center text-caption", i === current ? "font-semibold text-ink" : "text-ink-muted")}>
                  {point.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        {/* The figures behind the bars, for a screen reader. */}
        <ul id={listId} className="sr-only">
          {points.map((point) => (
            <li key={point.month}>{describe(point)}</li>
          ))}
        </ul>
      </section>

      {/* The phone board's shorter chart: no axis, thinner bars. */}
      <section className={cn(CARD, "flex flex-col gap-3.5 p-4 md:hidden")}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-title leading-[normal] font-semibold text-ink">{t("Income vs Expense")}</h2>
          <Legend size="sm" />
        </div>
        <div role="img" aria-label={t("Income and expense, by month")} aria-describedby={listId} className="flex h-40 items-end justify-between border-b border-input px-1">
          {points.map((point, i) => {
            const now = i === current;
            return (
              <div key={point.month} className="flex h-full items-end gap-0.75">
                <span className={cn("w-3 rounded-[6px_6px_3px_3px]", now ? "bg-chart-income" : "bg-chart-income/45")} style={{ height: height(point.income) }} />
                <span className={cn("w-3 rounded-[6px_6px_3px_3px]", now ? "bg-chart-expense" : "bg-chart-expense/40")} style={{ height: height(point.expense) }} />
              </div>
            );
          })}
        </div>
        <div aria-hidden="true" className="-mt-1.5 flex justify-between px-1">
          {points.map((point, i) => (
            <span key={point.month} className={cn("w-6.75 text-center text-[11px] leading-[normal]", i === current ? "font-semibold text-ink" : "text-ink-muted")}>
              {point.label}
            </span>
          ))}
        </div>
      </section>
    </>
  );
}

// The dark tooltip over a month: its income, expense and what was saved.
// It sits beside the month, on whichever side has room.
function ChartTip({ point, currency, index, count }: { point: HomeChartPoint; currency: string; index: number; count: number }) {
  const { t, fmt } = useLocale();
  const saved = point.income - point.expense;
  const center = ((index + 0.5) / count) * 100;
  const left = index >= count / 2;
  const row = "flex items-center gap-2";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-3 z-10 flex w-49 flex-col gap-2 rounded-[10px] bg-night-ink px-3.5 py-3 text-caption text-white shadow-overlay"
      style={left ? { right: `calc(${100 - center}% + 52px)` } : { left: `calc(${center}% + 52px)` }}
    >
      <span className="font-semibold text-white/88">{point.name}</span>
      <span className={row}>
        <span className="size-2 rounded-[2px] bg-mint-300" />
        <span className="grow text-white/75">{t("Income")}</span>
        <span className="font-semibold tabular-nums">{formatCurrency(point.income, currency, fmt)}</span>
      </span>
      <span className={row}>
        <span className="size-2 rounded-[2px] bg-night-coral" />
        <span className="grow text-white/75">{t("Expense")}</span>
        <span className="font-semibold tabular-nums">{formatCurrency(point.expense, currency, fmt)}</span>
      </span>
      <span className={cn(row, "border-t border-white/12 pt-2")}>
        <span className="grow text-white/75">{t("Saved")}</span>
        <span className={cn("font-bold tabular-nums", saved < 0 ? "text-night-coral" : "text-mint-200")}>{formatSignedCurrency(saved, currency, fmt)}</span>
      </span>
    </div>
  );
}
