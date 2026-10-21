"use client";

import Card from "@/components/smartly/Card";
import { formatCurrency } from "@/lib/customer/currency";
import { monthName, type MonthRate } from "@/lib/customer/insights";
import { type Locale, useLocale } from "@/lib/i18n/LocaleProvider";
import type { Translate } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";

const HEIGHT = 120;

interface KeptChartProps {
  rates: MonthRate[];
  currency: string;
  // The month under way, whose figures are only what it has come to so far.
  partialMonth: string | null;
}

// "October: ৳ 85,000 in, ৳ 25,000 kept", or "October so far: …" while it
// is under way, when its salary is in but not all of its spending.
function latestLine(point: MonthRate, soFar: boolean, currency: string, locale: Locale, t: Translate): string {
  const values = { month: monthName(point.month, locale), income: formatCurrency(point.income, currency), kept: formatCurrency(point.kept, currency), over: formatCurrency(-point.kept, currency) };
  if (point.kept < 0) return soFar ? t("{month} so far: {income} in, {over} more went out", values) : t("{month}: {income} in, {over} more went out", values);
  return soFar ? t("{month} so far: {income} in, {kept} kept", values) : t("{month}: {income} in, {kept} kept", values);
}

// The phone's "Income and what you kept": two thin bars a month, income in
// emerald and what was kept in mint, over the last six months. A month that
// spent more than came in draws its overspend in red instead of an empty
// bar. The latest month is written out, and the six are a table for screen
// readers, since a tap shows no tooltip.
export function KeptChart({ rates, currency, partialMonth }: KeptChartProps) {
  const { t, locale } = useLocale();
  const max = Math.max(...rates.map((r) => Math.max(r.income, -r.kept)), 1);
  const last = rates[rates.length - 1];
  const anyOverspent = rates.some((r) => r.kept < 0);
  const barHeight = (amount: number) => Math.round((amount / max) * HEIGHT);

  return (
    <Card padding="sm" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-h3 text-ink">{t("Income and what you kept")}</h2>
        <span className="text-small text-ink-muted">{t("Last 6 months")}</span>
      </div>
      {last && <p className="text-small font-semibold text-ink-2">{latestLine(last, last.month === partialMonth, currency, locale, t)}</p>}
      <div aria-hidden="true" className="flex gap-1">
        {rates.map((point) => {
          const overspent = point.kept < 0;
          return (
            <div key={point.month} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full items-end justify-center gap-0.75" style={{ height: HEIGHT }}>
                <span className="w-3 rounded-t-sm bg-emerald" style={{ height: barHeight(point.income) }} />
                <span className={cn("w-3 rounded-t-sm", overspent ? "bg-expense-fill" : "bg-mint-300")} style={{ height: overspent ? Math.max(3, barHeight(-point.kept)) : barHeight(point.kept) }} />
              </div>
              <span className={cn("text-caption", point === last ? "font-bold text-ink" : "font-normal text-ink-muted")}>{monthName(point.month, locale, "short")}</span>
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 text-caption font-normal text-ink-muted">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-[3px] bg-emerald" />
          {t("Income")}
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-[3px] bg-mint-300" />
          {t("Kept")}
        </span>
        {anyOverspent && (
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-[3px] bg-expense-fill" />
            {t("Overspent")}
          </span>
        )}
      </div>
      <table className="sr-only">
        <caption>{t("Income and what you kept, by month")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("Month")}</th>
            <th scope="col">{t("Income")}</th>
            <th scope="col">{t("Kept")}</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((point) => (
            <tr key={point.month}>
              <th scope="row">{point.month === partialMonth ? t("{month} so far", { month: monthName(point.month, locale, "long", true) }) : monthName(point.month, locale, "long", true)}</th>
              <td>{formatCurrency(point.income, currency)}</td>
              <td>{formatCurrency(point.kept, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
