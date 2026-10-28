"use client";

import { ArrowDown, ArrowUp, Target } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { MonthSwitcher, monthLabel } from "@/components/modules/Customer/Budget/MonthSwitcher";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import ProgressBar from "@/components/smartly/ProgressBar";
import type { MonthlyPlan } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { plural } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BudgetDialog, type BudgetDialogState } from "./BudgetDialog";
import { budgetState, daysLeft, monthHref, percentOf, type BudgetState } from "./ieFigures";

interface BudgetPlanPageClientProps {
  businessId: string;
  currency: string;
  canManage: boolean;
  // The month on screen (its plan's figures null when it has none).
  plan: MonthlyPlan | null;
  month: number;
  year: number;
  current: { month: number; year: number };
  plans: MonthlyPlan[];
  today: string;
}

const STATE: Record<BudgetState, { chip: string; label: string; bar: "income" | "warning" | "expense"; text: string }> = {
  ON_TRACK: { chip: "bg-income-soft text-income", label: "On track", bar: "income", text: "text-income" },
  NEAR_LIMIT: { chip: "bg-warning-soft text-warning", label: "Near limit", bar: "warning", text: "text-warning" },
  OVER: { chip: "bg-expense-soft text-expense", label: "Over budget", bar: "expense", text: "text-expense" },
};

// Income & Expense > Budget Planning: a month's income target and expense
// budget, how far each has got, the savings they plan for, and every month
// planned so far.
export function BudgetPlanPageClient({ businessId, currency, canManage, plan, month, year, current, plans, today }: BudgetPlanPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSwitching, startSwitch] = useTransition();
  const [editing, setEditing] = useState<BudgetDialogState | null>(null);
  const money = (value: number | string) => formatCurrency(value, currency, fmt);

  const goTo = (nextMonth: number, nextYear: number) =>
    startSwitch(() => router.push(monthHref(pathname, Object.fromEntries(searchParams.entries()), nextMonth, nextYear, current)));

  const earned = Number(plan?.earned ?? 0);
  const spent = Number(plan?.spent ?? 0);
  const target = plan?.incomeTarget ? Number(plan.incomeTarget) : null;
  const budget = plan?.expenseBudget ? Number(plan.expenseBudget) : null;
  const incomePct = percentOf(earned, target);
  const expensePct = percentOf(spent, budget);
  const state = STATE[budgetState(expensePct)];
  const left = daysLeft(year, month, today);
  const isPast = left === 0;

  const open = (m: number, y: number, figures?: { incomeTarget: string | null; expenseBudget: string | null }) =>
    setEditing({ month: m, year: y, incomeTarget: figures?.incomeTarget ? String(Number(figures.incomeTarget)) : "", expenseBudget: figures?.expenseBudget ? String(Number(figures.expenseBudget)) : "" });
  // The month list: the years planned and a year either side of today.
  const years = [...new Set([current.year - 1, current.year, current.year + 1, ...plans.map((p) => p.year)])].sort();

  return (
    <PageFrame>
      <PageHeader
        title={t("Budget Planning")}
        description={t("Set an income target and an expense budget for each month.")}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <MonthSwitcher month={month} year={year} onChange={goTo} className={cn("rounded-full", isSwitching && "opacity-60")} />
            {canManage && (
              <Button onClick={() => open(month, year, plan ?? undefined)} className="rounded-full px-4.5">
                <Target strokeWidth={2.25} aria-hidden="true" />
                {t("Set monthly budget")}
              </Button>
            )}
          </div>
        }
      />

      <div aria-busy={isSwitching || undefined} className="grid gap-4 lg:grid-cols-2">
        {/* Income target */}
        <Card padding="none" className="flex flex-col gap-3.5 p-6" role="region" aria-label={t("Income target")}>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2.5">
              <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-[10px] bg-income-soft text-income">
                <ArrowUp className="size-4.5" strokeWidth={2.25} />
              </span>
              <h2 className="text-title font-semibold text-ink">{t("Income target")}</h2>
            </span>
            {target !== null && (
              <span className={cn("rounded-full px-2.5 py-0.75 text-caption font-semibold", incomePct >= 100 ? "bg-income-soft text-income" : "bg-surface-sunken text-ink-2")}>
                {t(incomePct >= 100 ? "Target reached" : "In progress")}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[32px] font-bold tracking-[-0.02em] text-ink tabular-nums">{money(earned)}</span>
            <span className="text-body text-ink-muted">{target === null ? t("earned, no target set") : t("earned of {amount}", { amount: money(target) })}</span>
          </div>
          {target !== null && (
            <>
              <ProgressBar value={incomePct} tone="income" label={t("Income target progress")} className="h-3" />
              <div className="flex justify-between gap-3 text-body">
                <span className="font-semibold text-income">{t("{percent}% of target", { percent: formatCount(incomePct, fmt) })}</span>
                <span className="text-ink-2">{earned < target ? t("{amount} to go", { amount: money(target - earned) }) : t("{amount} above target", { amount: money(earned - target) })}</span>
              </div>
            </>
          )}
        </Card>

        {/* Expense budget */}
        <Card padding="none" className="flex flex-col gap-3.5 p-6" role="region" aria-label={t("Expense budget")}>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2.5">
              <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-[10px] bg-expense-soft text-expense">
                <ArrowDown className="size-4.5" strokeWidth={2.25} />
              </span>
              <h2 className="text-title font-semibold text-ink">{t("Expense budget")}</h2>
            </span>
            {budget !== null && <span className={cn("rounded-full px-2.5 py-0.75 text-caption font-semibold", state.chip)}>{t(state.label)}</span>}
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[32px] font-bold tracking-[-0.02em] text-ink tabular-nums">{money(spent)}</span>
            <span className="text-body text-ink-muted">{budget === null ? t("spent, no budget set") : t("spent of {amount}", { amount: money(budget) })}</span>
          </div>
          {budget !== null && (
            <>
              <ProgressBar value={expensePct} tone={state.bar} label={t("Expense budget progress")} className="h-3" />
              <div className="flex justify-between gap-3 text-body">
                <span className={cn("font-semibold", state.text)}>{t("{percent}% of budget", { percent: formatCount(expensePct, fmt) })}</span>
                <span className="text-ink-2">{spent <= budget ? t("{amount} left", { amount: money(budget - spent) }) : t("{amount} over budget", { amount: money(spent - budget) })}</span>
              </div>
            </>
          )}
        </Card>
      </div>

      <Card padding="none" className="grid sm:grid-cols-3">
        <div className="flex flex-col gap-1 px-6 py-4">
          <span className="text-small text-ink-muted">{t("Planned savings")}</span>
          <span className="text-[20px] font-bold text-ink tabular-nums">{target !== null && budget !== null ? money(target - budget) : "—"}</span>
        </div>
        <div className="flex flex-col gap-1 border-divider px-6 py-4 max-sm:border-t sm:border-l">
          <span className="text-small text-ink-muted">{t("Saved so far")}</span>
          <span className={cn("text-[20px] font-bold tabular-nums", earned - spent < 0 ? "text-expense" : "text-income")}>{money(earned - spent)}</span>
        </div>
        <div className="flex flex-col gap-1 border-divider px-6 py-4 max-sm:border-t sm:border-l">
          <span className="text-small text-ink-muted">{t("Days left this month")}</span>
          <span className="text-[20px] font-bold text-ink tabular-nums">{isPast ? t("Month closed") : plural(t, left, "{count} day", "{count} days", undefined, fmt)}</span>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden" role="region" aria-labelledby="plans-title">
        <div className="border-b border-divider px-6 py-4">
          <h2 id="plans-title" className="text-title font-semibold text-ink">
            {t("Monthly plans")}
          </h2>
        </div>
        {plans.length === 0 ? (
          <p className="px-6 py-8 text-center text-small text-ink-muted">{t("No month has a plan yet. Set this month's budget to start.")}</p>
        ) : (
          <>
            <div className="hidden grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_120px_80px] items-center gap-x-6 border-b border-divider bg-table-head px-6 py-2.5 text-caption font-semibold text-ink-muted md:grid">
              <span>{t("Month")}</span>
              <span>{t("Income vs target")}</span>
              <span>{t("Expense vs budget")}</span>
              <span className="text-right">{t("Saved")}</span>
              <span />
            </div>
            <ul>
              {plans.map((row) => {
                const rowTarget = row.incomeTarget ? Number(row.incomeTarget) : null;
                const rowBudget = row.expenseBudget ? Number(row.expenseBudget) : null;
                const rowEarned = Number(row.earned);
                const rowSpent = Number(row.spent);
                const ip = percentOf(rowEarned, rowTarget);
                const ep = percentOf(rowSpent, rowBudget);
                const rowState = STATE[budgetState(ep)];
                const isCurrent = row.month === current.month && row.year === current.year;
                const isFuture = row.year > current.year || (row.year === current.year && row.month > current.month);
                const label = monthLabel(row.month, row.year, fmt);
                return (
                  <li
                    key={`${row.year}-${row.month}`}
                    className={cn(
                      "grid grid-cols-2 items-center gap-x-6 gap-y-3 border-b border-divider px-6 py-4 last:border-b-0 md:h-18 md:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_120px_80px] md:py-0",
                      row.month === month && row.year === year && "bg-hover",
                    )}
                  >
                    <span className="flex flex-col gap-0.5 max-md:col-span-2">
                      <span className="text-body font-semibold text-ink">{label}</span>
                      <span className="text-caption text-ink-muted">{t(isCurrent ? "Current month" : isFuture ? "Upcoming" : "Closed")}</span>
                    </span>
                    <span className="flex flex-col gap-1.5">
                      <span className="flex justify-between gap-2 text-small tabular-nums">
                        <span className="text-ink-2">{rowTarget === null ? money(rowEarned) : t("{amount} of {total}", { amount: money(rowEarned), total: money(rowTarget) })}</span>
                        {rowTarget !== null && <span className="font-semibold text-income">{toLocaleDigits(`${ip}%`, fmt)}</span>}
                      </span>
                      <ProgressBar value={ip} tone="income" label={t("Income vs target")} />
                    </span>
                    <span className="flex flex-col gap-1.5">
                      <span className="flex justify-between gap-2 text-small tabular-nums">
                        <span className="text-ink-2">{rowBudget === null ? money(rowSpent) : t("{amount} of {total}", { amount: money(rowSpent), total: money(rowBudget) })}</span>
                        {rowBudget !== null && <span className={cn("font-semibold", rowState.text)}>{toLocaleDigits(`${ep}%`, fmt)}</span>}
                      </span>
                      <ProgressBar value={ep} tone={rowState.bar} label={t("Expense vs budget")} />
                    </span>
                    <span className="text-body font-semibold text-ink tabular-nums md:text-right">{money(rowEarned - rowSpent)}</span>
                    <span className="flex justify-end">
                      {canManage && (
                        <Button variant="secondary" size="sm" onClick={() => open(row.month, row.year, row)} aria-label={t("Edit {month} plan", { month: label })} className="h-11 rounded-full px-3.5">
                          {t("Edit")}
                        </Button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      <BudgetDialog
        businessId={businessId}
        currency={currency}
        editing={editing}
        years={years}
        onClose={() => setEditing(null)}
        onSaved={(m, y) => {
          if (m === month && y === year) router.refresh();
          else goTo(m, y);
        }}
      />
    </PageFrame>
  );
}
