"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { useAddActions } from "@/components/modules/Customer/Layout/AddActionsProvider";
import { PeriodPicker } from "@/components/modules/Customer/Shared/PeriodPicker";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { ActiveMonth, CategoryBreakdown } from "@/lib/customer/api";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { type Period, type PickedPeriod, periodHref, type YearMonth } from "@/lib/customer/period";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { plural } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CategoryBars } from "./CategoryBars";
import { budgetHref, oneDecimal, savingsRate, transactionsHref } from "./ieFigures";

interface IEOverviewPageClientProps {
  period: Period;
  current: YearMonth;
  // YYYY-MM-DD on the app's calendar.
  today: string;
  activeMonths: ActiveMonth[] | null;
  income: CategoryBreakdown;
  expense: CategoryBreakdown;
  currency: string;
  // An owner or accountant: they can add a transaction.
  canManage: boolean;
}

// Income & Expense > Overview (the IEOverview board): a month's (a year's,
// or any days') totals, the net and the share kept, each a way into its
// transactions; then each kind by category, every category opening its own.
export function IEOverviewPageClient({ period, current, today, activeMonths, income, expense, currency, canManage }: IEOverviewPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { actions, run } = useAddActions();
  const [isSwitching, startSwitch] = useTransition();
  const thisMonth: Period = { kind: "month", ...current };
  const totalIncome = Number(income.total);
  const totalExpense = Number(expense.total);
  const net = totalIncome - totalExpense;
  const rate = savingsRate(totalIncome, totalExpense);

  const goTo = (next: PickedPeriod) => startSwitch(() => router.push(periodHref(pathname, {}, next, thisMonth)));
  const newTransaction = () => {
    const action = actions.find((candidate) => candidate.key === "expense");
    if (action) run(action);
  };
  // Counted over real categories: the money with none is not one.
  const fromCategories = (breakdown: CategoryBreakdown) => {
    const count = breakdown.categories.filter((row) => !row.uncategorised).length;
    return count === 0 && Number(breakdown.total) > 0 ? t("Not sorted into categories yet") : plural(t, count, "From {count} category", "From {count} categories", undefined, fmt);
  };

  const kpis = [
    {
      key: "income",
      label: t("Total income"),
      dot: "bg-income",
      value: formatCurrency(totalIncome, currency, fmt),
      tone: "text-income",
      sub: fromCategories(income),
      href: transactionsHref(period, current, { type: "INCOME" }),
      tip: t("See all income"),
    },
    {
      key: "expense",
      label: t("Total expense"),
      dot: "bg-expense",
      value: formatCurrency(totalExpense, currency, fmt),
      tone: "text-expense",
      sub: fromCategories(expense),
      href: transactionsHref(period, current, { type: "EXPENSE" }),
      tip: t("See all expenses"),
    },
    {
      key: "net",
      label: t("Net"),
      dot: null,
      value: formatSignedCurrency(net, currency, fmt),
      tone: net < 0 ? "text-expense" : "text-ink",
      sub: t("Income − expense"),
      href: transactionsHref(period, current),
      tip: t("See every transaction"),
    },
  ];

  return (
    <PageFrame className="gap-4">
      <PageHeader
        title={t("Income & Expense Overview")}
        actions={
          <>
            <PeriodPicker period={period} today={today} activeMonths={activeMonths} defaultPeriod={thisMonth} onPick={goTo} busy={isSwitching} align="end" />
            {canManage && actions.some((action) => action.key === "expense") && (
              <Button onClick={newTransaction} className="rounded-sm">
                <Plus strokeWidth={2.25} />
                {t("Transaction")}
              </Button>
            )}
          </>
        }
      />

      <div aria-busy={isSwitching || undefined} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.key} padding="none" interactive asChild className="rounded-[14px]">
            <Link href={kpi.href} title={kpi.tip} className="flex min-w-0 flex-col gap-1.5 px-5 py-4.5">
              <span className="flex items-center gap-2 text-small text-ink-muted">
                {kpi.dot && <span aria-hidden="true" className={cn("size-2 rounded-full", kpi.dot)} />}
                {kpi.label}
              </span>
              <span className={cn("truncate text-[26px] leading-tight font-bold tracking-[-0.02em] tabular-nums", kpi.tone)}>{kpi.value}</span>
              <span className="text-small text-ink-muted">{kpi.sub}</span>
            </Link>
          </Card>
        ))}
        <Card padding="none" interactive asChild className="rounded-[14px]">
          <Link href={budgetHref(period)} title={t("Open Budget Planning")} className="flex min-w-0 flex-col gap-1.5 px-5 py-4.5">
            <span className="text-small text-ink-muted">{t("Savings rate")}</span>
            <span className={cn("text-[26px] leading-tight font-bold tracking-[-0.02em] tabular-nums", rate === null ? (totalExpense > 0 ? "text-expense" : "text-ink-muted") : rate < 0 ? "text-expense" : "text-emerald")}>
              {rate === null ? "–" : `${rate < 0 ? "− " : ""}${toLocaleDigits(oneDecimal(Math.abs(rate)), fmt)}%`}
            </span>
            {rate === null ? (
              <span className="text-small text-ink-muted">{totalExpense > 0 ? t("No income, only spending") : t("No transactions in this period")}</span>
            ) : rate < 0 ? (
              <span className="text-small text-expense">{t("Spent more than you earned")}</span>
            ) : (
              <span role="img" aria-label={t("{pct}% of income kept", { pct: toLocaleDigits(oneDecimal(rate), fmt) })} className="mt-2 block h-2 overflow-hidden rounded-full bg-surface-sunken">
                <span className="block h-full rounded-full bg-emerald" style={{ width: `${Math.min(100, rate)}%` }} />
              </span>
            )}
          </Link>
        </Card>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <CategoryBars
          id="ov-income"
          title={t("Income by category")}
          totalLabel={t("Total income")}
          viewAll={{ label: t("All income"), href: transactionsHref(period, current, { type: "INCOME" }) }}
          breakdown={income}
          currency={currency}
          tone="income"
          emptyText={t("No income in this period.")}
          hrefFor={(row) => transactionsHref(period, current, { type: "INCOME", ...(row.uncategorised ? { uncategorised: true } : { categoryId: row.name }) })}
        />
        <CategoryBars
          id="ov-expense"
          title={t("Expense by category")}
          totalLabel={t("Total expense")}
          viewAll={{ label: t("All expenses"), href: transactionsHref(period, current, { type: "EXPENSE" }) }}
          breakdown={expense}
          currency={currency}
          tone="expense"
          emptyText={t("No expenses in this period.")}
          hrefFor={(row) => transactionsHref(period, current, { type: "EXPENSE", ...(row.uncategorised ? { uncategorised: true } : { categoryId: row.name }) })}
        />
      </div>
    </PageFrame>
  );
}
