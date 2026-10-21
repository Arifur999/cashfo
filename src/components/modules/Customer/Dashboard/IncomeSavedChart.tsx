"use client";

import { useId } from "react";
import Card from "@/components/smartly/Card";
import { formatCompactAmount, formatCurrency } from "@/lib/customer/currency";
import { bestMonthNote } from "@/lib/customer/homeInsights";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { HomeChartPoint } from "./homeTypes";

const HEIGHT = 200;

// Bangla's vowel signs need more room than the note's fixed line when it
// wraps.
const BN_LEADING = "[.font-bn_&]:leading-normal";

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
  points: HomeChartPoint[];
  currency: string;
  className?: string;
}

// "Income and what you kept": two bars a month for the last six months --
// what came in, and what was left of it once the month's spending was out
// (the same figure as the hero's ring and Insights) -- the current month on
// a strip band, and a line under it that says how this month compares. A
// month that spent more than it earned keeps nothing: its bar stays at
// zero, and its line says by how much.
export function IncomeSavedChart({ points, currency, className }: IncomeSavedChartProps) {
  const { t } = useLocale();
  const listId = useId();
  const top = Math.max(0, ...points.map((p) => Math.max(p.income, p.kept)));
  const max = niceMax(top);
  const current = points[points.length - 1];
  const note = bestMonthNote(points);
  const beatenBy = note && !note.best ? points.find((p) => p.month === note.beatenBy)?.name : undefined;
  const money = (value: number) => formatCurrency(value, currency);
  const describe = (point: HomeChartPoint) =>
    point.kept >= 0
      ? t("{month}: income {income}, kept {kept}", { month: point.name, income: money(point.income), kept: money(point.kept) })
      : t("{month}: income {income}, {amount} more went out than came in", { month: point.name, income: money(point.income), amount: money(-point.kept) });

  return (
    <Card className={cn("flex flex-col gap-4 p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-h3 leading-6 text-ink">{t("Income and what you kept")}</h3>
          <span className="text-small leading-4.5 text-ink-muted">{t("Last 6 months")}</span>
        </div>
        {top > 0 && (
          <span aria-hidden="true" className="flex gap-4 text-caption text-ink-2">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-[3px] bg-chart-income" />
              {t("Income")}
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-[3px] bg-chart-savings" />
              {t("Kept")}
            </span>
          </span>
        )}
      </div>

      {top === 0 ? (
        <p className="rounded-md bg-strip px-4 py-6 text-center text-body text-ink-muted">{t("Your income and what you keep show here after your first income.")}</p>
      ) : (
        <>
          <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-2">
            <div aria-hidden="true" className="relative text-right text-caption font-normal text-ink-muted tabular-nums" style={{ height: HEIGHT }}>
              <span className="absolute -top-2 right-0">{formatCompactAmount(max)}</span>
              <span className="absolute right-0" style={{ top: HEIGHT / 2 - 8 }}>
                {formatCompactAmount(max / 2)}
              </span>
              <span className="absolute right-0 -bottom-2">0</span>
            </div>
            <div
              role="img"
              aria-label={t("Income and what you kept, by month")}
              aria-describedby={listId}
              className="grid items-end border-b border-line bg-[linear-gradient(var(--chart-grid),var(--chart-grid))_0_0/100%_1px_no-repeat,linear-gradient(var(--chart-grid),var(--chart-grid))_0_50%/100%_1px_no-repeat]"
              style={{ height: HEIGHT, gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
            >
              {points.map((point) => {
                const income = Math.round((Math.max(0, point.income) / max) * HEIGHT);
                const kept = Math.round((Math.max(0, point.kept) / max) * HEIGHT);
                return (
                  <div key={point.month} title={describe(point)} className={cn("flex h-full items-end justify-center gap-2 rounded-t-md", point === current && "bg-strip")}>
                    <span className="w-5.5 rounded-t-sm bg-chart-income" style={{ height: income }} />
                    <span className="w-5.5 rounded-t-sm bg-chart-savings" style={{ height: kept }} />
                  </div>
                );
              })}
            </div>
            <span />
            <div aria-hidden="true" className="grid text-center text-caption" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
              {points.map((point) => (
                <span key={point.month} className={point === current ? "font-bold text-ink" : "font-medium text-ink-muted"}>
                  {point.label}
                </span>
              ))}
            </div>
          </div>
          {/* The figures behind the bars, for a screen reader. */}
          <ul id={listId} className="sr-only">
            {points.map((point) => (
              <li key={point.month}>{describe(point)}</li>
            ))}
          </ul>
        </>
      )}

      {current && current.kept > 0 && (
        <p className={cn("rounded-md bg-mint-50 px-4 py-3 text-body leading-5 text-brand-ink", BN_LEADING)}>
          {fillNodes(
            t(note?.best ? "You kept {amount} in {month}, your best in six months." : beatenBy ? "You kept {amount} in {month}, less than in {other}." : "You kept {amount} in {month}."),
            { amount: <b>{money(current.kept)}</b>, month: current.name, other: beatenBy ?? "" },
          )}
        </p>
      )}
      {current && current.kept < 0 && (
        <p className={cn("rounded-md bg-expense-soft px-4 py-3 text-body leading-5 text-expense", BN_LEADING)}>
          {fillNodes(t("In {month}, {amount} more went out than came in."), { amount: <b>{money(-current.kept)}</b>, month: current.name })}
        </p>
      )}
    </Card>
  );
}
