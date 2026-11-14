"use client";

import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
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

// The board's figure card: 18px corners, 20px in, and on hover a darker
// edge, a deeper shadow and a round arrow in the top corner.
const KPI_CARD = "group relative flex min-w-0 flex-col gap-1.5 p-5 transition-[border-color,box-shadow] hover:border-input hover:shadow-[0_2px_4px_rgba(18,32,29,0.06),0_10px_28px_rgba(18,32,29,0.08)]";
const KPI_VALUE = "truncate text-[24px] font-bold tracking-[-0.02em] tabular-nums";

function KpiArrow() {
  return (
    <span aria-hidden="true" className="absolute top-4 right-4 flex size-7 items-center justify-center rounded-full bg-surface-sunken text-ink-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
      <ArrowRight className="size-3.5" strokeWidth={2.25} />
    </span>
  );
}

// Income & Expense > Overview (the IEOverview board): a month's (a year's,
// or any days') totals, the net and the share kept, each a way into its
// transactions; then each kind by category, every category opening its own.
export function IEOverviewPageClient({ period, current, today, activeMonths, income, expense, currency, canManage }: IEOverviewPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isSwitching, startSwitch] = useTransition();
  const thisMonth: Period = { kind: "month", ...current };
  const totalIncome = Number(income.total);
  const totalExpense = Number(expense.total);
  const net = totalIncome - totalExpense;
  const rate = savingsRate(totalIncome, totalExpense);

  const goTo = (next: PickedPeriod) => startSwitch(() => router.push(periodHref(pathname, {}, next, thisMonth)));
  // Counted over real categories: the money with none is not one.
  const fromCategories = (breakdown: CategoryBreakdown) => {
    const count = breakdown.categories.filter((row) => !row.uncategorised).length;
    return count === 0 && Number(breakdown.total) > 0 ? t("Not sorted into categories yet") : plural(t, count, "From {count} category", "From {count} categories", undefined, fmt);
  };

  const kpis = [
    {
      key: "income",
      label: t("Total income"),
      dot: "bg-success",
      value: formatCurrency(totalIncome, currency, fmt),
      tone: "text-success",
      sub: fromCategories(income),
      href: transactionsHref(period, current, { type: "INCOME" }),
      tip: t("See all income"),
    },
    {
      key: "expense",
      label: t("Total expense"),
      dot: "bg-expense-fill",
      value: formatCurrency(totalExpense, currency, fmt),
      tone: "text-expense-fill",
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
  const rateText = rate === null ? "–" : `${rate < 0 ? "− " : ""}${toLocaleDigits(oneDecimal(Math.abs(rate)), fmt)}%`;

  return (
    <PageFrame className="gap-4 leading-[normal] md:pb-8">
      <PageHeader
        title={t("Income & Expense Overview")}
        className="md:items-center"
        actions={
          <>
            <PeriodPicker period={period} today={today} activeMonths={activeMonths} defaultPeriod={thisMonth} onPick={goTo} busy={isSwitching} align="end" />
            {/* The board's button opens the New transaction popup on Transactions,
                where the saved entry then shows. */}
            {canManage && (
              <Button asChild size="lg" className="gap-1.5 px-4.5">
                <Link href="/transactions?new=1">
                  <Plus strokeWidth={2.5} />
                  {t("Transaction")}
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div aria-busy={isSwitching || undefined} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.key} padding="none" asChild className={KPI_CARD}>
            <Link href={kpi.href} title={kpi.tip}>
              <span className="flex items-center gap-2 text-small text-ink-muted">
                {kpi.dot && <span aria-hidden="true" className={cn("size-2 rounded-full", kpi.dot)} />}
                {kpi.label}
              </span>
              <span title={kpi.value} className={cn(KPI_VALUE, kpi.tone)}>
                {kpi.value}
              </span>
              <span className="text-small text-ink-muted">{kpi.sub}</span>
              <KpiArrow />
            </Link>
          </Card>
        ))}
        <Card padding="none" asChild className={KPI_CARD}>
          <Link href={budgetHref(period)} title={t("Open Budget Planning")}>
            <span className="text-small text-ink-muted">{t("Savings rate")}</span>
            <span title={rateText} className={cn(KPI_VALUE, rate === null ? (totalExpense > 0 ? "text-expense" : "text-ink-muted") : rate < 0 ? "text-expense" : "text-emerald")}>
              {rateText}
            </span>
            {rate === null ? (
              <span className="text-small text-ink-muted">{totalExpense > 0 ? t("No income, only spending") : t("No transactions in this period")}</span>
            ) : rate < 0 ? (
              <span className="text-small text-ink-muted">{t("Spent more than you earned")}</span>
            ) : (
              <span
                role="progressbar"
                aria-label={t("Savings rate")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(Math.min(100, rate))}
                aria-valuetext={t("{pct}% of income kept", { pct: toLocaleDigits(oneDecimal(rate), fmt) })}
                className="mt-1 block h-2 overflow-hidden rounded-full bg-surface-sunken"
              >
                <span className="block h-full rounded-full bg-emerald" style={{ width: `${Math.min(100, rate)}%` }} />
              </span>
            )}
            <KpiArrow />
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
