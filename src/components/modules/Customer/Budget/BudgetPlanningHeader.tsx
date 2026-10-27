"use client";

import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import Link from "next/link";
import Button from "@/components/smartly/Button";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { type BudgetPath, type BudgetTab, budgetTabHref } from "./budgetFigures";
import { MonthSwitcher } from "./MonthSwitcher";

interface BudgetPlanningHeaderProps {
  tab: BudgetTab;
  path: BudgetPath;
  month: number;
  year: number;
  counts: { expense: number; income: number };
  onMonthChange: (month: number, year: number) => void;
  // Add category, for an owner or accountant.
  onAdd?: () => void;
}

// Budget planning's title, month switcher, add button and the two tabs
// (design-v4 Budget / BudgetIncome). The tabs are links, so each keeps its
// own address and the month on show.
export function BudgetPlanningHeader({ tab, path, month, year, counts, onMonthChange, onAdd }: BudgetPlanningHeaderProps) {
  const { t, locale } = useLocale();
  const tabs = [
    { key: "expense" as const, label: t("Expense categories"), count: counts.expense, icon: ArrowUpRight },
    { key: "income" as const, label: t("Income categories"), count: counts.income, icon: ArrowDownLeft },
  ];

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-page-title text-ink">{t("Budget planning")}</h1>
          <p className="text-body text-ink-muted">{t("Set a monthly limit for each kind of spending, and see where your income comes from.")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {/* Across the page on a phone, with the add button as a round "+" beside it. */}
          <MonthSwitcher month={month} year={year} onChange={onMonthChange} className="max-md:flex-1 max-md:justify-between" />
          {onAdd && (
            <Button onClick={onAdd} className="gap-1.5 max-md:w-10 max-md:px-0">
              <Plus strokeWidth={2.5} className="size-4" />
              <span className="max-md:sr-only">{t(tab === "expense" ? "Add expense category" : "Add income category")}</span>
            </Button>
          )}
        </div>
      </div>

      <nav aria-label={t("Category type")} className="flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map(({ key, label, count, icon: Icon }) => {
          const on = key === tab;
          return (
            <Link
              key={key}
              href={budgetTabHref(key, path, month, year)}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex h-10.5 shrink-0 items-center gap-2 border-b-2 px-1 text-body whitespace-nowrap transition-colors first:mr-5 max-sm:flex-1 max-sm:justify-center max-sm:first:mr-0",
                on ? "border-emerald font-semibold text-emerald" : "border-transparent font-medium text-ink-muted hover:text-ink",
              )}
            >
              <Icon className="size-3.75 max-sm:hidden" strokeWidth={2.25} aria-hidden="true" />
              {label}
              <span className={cn("rounded-full px-1.75 py-px text-caption tabular-nums", on ? "bg-emerald-soft" : "bg-surface-sunken")}>{formatCount(count, locale)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
