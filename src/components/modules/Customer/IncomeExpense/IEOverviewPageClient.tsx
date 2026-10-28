"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { MonthSwitcher } from "@/components/modules/Customer/Budget/MonthSwitcher";
import Card from "@/components/smartly/Card";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import ProgressBar from "@/components/smartly/ProgressBar";
import type { CategoryBreakdown } from "@/lib/customer/api";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { plural } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPercent } from "@/lib/number";
import { cn } from "@/lib/utils";
import { CategoryBars } from "./CategoryBars";
import { monthHref, savingsRate } from "./ieFigures";

interface IEOverviewPageClientProps {
  month: number;
  year: number;
  current: { month: number; year: number };
  income: CategoryBreakdown;
  expense: CategoryBreakdown;
  currency: string;
}

// Income & Expense > Overview: how the month's money came in and went out --
// the totals, the net, the share kept, and each kind by category.
export function IEOverviewPageClient({ month, year, current, income, expense, currency }: IEOverviewPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSwitching, startSwitch] = useTransition();
  const totalIncome = Number(income.total);
  const totalExpense = Number(expense.total);
  const net = totalIncome - totalExpense;
  const rate = savingsRate(totalIncome, totalExpense);

  const goTo = (nextMonth: number, nextYear: number) =>
    startSwitch(() => router.push(monthHref(pathname, Object.fromEntries(searchParams.entries()), nextMonth, nextYear, current)));

  const categories = (count: number) => plural(t, count, "From {count} category", "From {count} categories", undefined, fmt);

  return (
    <PageFrame>
      <PageHeader
        title={t("Overview")}
        description={t("How this month's money came in and went out.")}
        actions={<MonthSwitcher month={month} year={year} onChange={goTo} className={cn("rounded-full", isSwitching && "opacity-60")} />}
      />

      <div aria-busy={isSwitching || undefined} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex flex-col gap-1.5">
          <span className="flex items-center gap-2 text-small text-ink-muted">
            <span aria-hidden="true" className="size-2 rounded-full bg-income" />
            {t("Total income")}
          </span>
          <span className="text-[26px] font-bold tracking-[-0.02em] text-income tabular-nums">{formatCurrency(totalIncome, currency, fmt)}</span>
          <span className="text-small text-ink-muted">{categories(income.categories.length)}</span>
        </Card>
        <Card className="flex flex-col gap-1.5">
          <span className="flex items-center gap-2 text-small text-ink-muted">
            <span aria-hidden="true" className="size-2 rounded-full bg-expense" />
            {t("Total expense")}
          </span>
          <span className="text-[26px] font-bold tracking-[-0.02em] text-expense tabular-nums">{formatCurrency(totalExpense, currency, fmt)}</span>
          <span className="text-small text-ink-muted">{categories(expense.categories.length)}</span>
        </Card>
        <Card className="flex flex-col gap-1.5">
          <span className="text-small text-ink-muted">{t("Net")}</span>
          <span className="text-[26px] font-bold tracking-[-0.02em] text-ink tabular-nums">{formatSignedCurrency(net, currency, fmt)}</span>
          <span className="text-small text-ink-muted">{t("Income − expense")}</span>
        </Card>
        <Card className="flex flex-col gap-1.5">
          <span className="text-small text-ink-muted">{t("Savings rate")}</span>
          <span className="text-[26px] font-bold tracking-[-0.02em] text-emerald tabular-nums">{rate === null ? "—" : toLocaleDigits(formatPercent(rate), fmt)}</span>
          {rate === null ? (
            <span className="text-small text-ink-muted">{t("Shows up after your first income")}</span>
          ) : (
            <ProgressBar value={Math.max(0, rate)} label={t("Savings rate")} className="mt-1" />
          )}
        </Card>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <CategoryBars id="ov-income" title={t("Income by category")} breakdown={income} currency={currency} tone="income" emptyText="No income this month yet." />
        <CategoryBars id="ov-expense" title={t("Expense by category")} breakdown={expense} currency={currency} tone="expense" emptyText="No expenses this month yet." />
      </div>
    </PageFrame>
  );
}
