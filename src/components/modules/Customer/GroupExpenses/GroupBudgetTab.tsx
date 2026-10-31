"use client";

import { Plus } from "lucide-react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { ListCard, ListCell, ListHead, ListHeadCell, ListRow, ListRowActions } from "@/components/smartly/list";
import { formatCurrency } from "@/lib/customer/currency";
import { groupMonthOf } from "@/lib/customer/groupDisplay";
import { budgetMonths, budgetPageMonths, budgetTotals, closedFor, firstMonthOf, spendByMonthKey } from "@/lib/customer/groupFamily";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { GroupPageData } from "./groupTypes";

// Month, budget, spent, left or over, used, action.
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_130px_130px_130px_170px_104px]";

interface GroupBudgetTabProps {
  data: GroupPageData;
  onSet: (key: string) => void;
}

// The group's budget month by month (the v7 GroupBudget board): next month
// back to the first, with what each spent against it.
export function GroupBudgetTab({ data, onSet }: GroupBudgetTabProps) {
  const { t, fmt } = useLocale();
  const money = (value: number) => formatCurrency(Math.abs(value), data.currency, fmt);
  const currentKey = groupMonthOf(data.today, data.startDay);
  const expenses = data.allExpenses ?? data.recentExpenses;
  const spent = spendByMonthKey(expenses, data.startDay);
  const first = firstMonthOf(currentKey, data.members, data.budgets, expenses, data.startDay);
  const rows = budgetMonths(budgetPageMonths(currentKey, first), data.budgets, spent, currentKey);
  const totals = budgetTotals(rows);
  const warnAt = data.settings.budgetWarnPercent === undefined ? 90 : data.settings.budgetWarnPercent;
  const left = totals.budget - totals.spent;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Card padding="none" className="flex flex-col gap-1 px-5 py-4">
          <span className="text-small text-ink-muted">{t("Total budget")}</span>
          <span className="text-[24px] font-bold text-ink tabular-nums">{money(totals.budget)}</span>
          <span className="text-caption text-ink-muted">{t(totals.withBudget === 1 ? "{count} month with a budget" : "{count} months with a budget", { count: formatCount(totals.withBudget, fmt) })}</span>
        </Card>
        <Card padding="none" className="flex flex-col gap-1 px-5 py-4">
          <span className="text-small text-ink-muted">{t("Total spent")}</span>
          <span className="text-[24px] font-bold text-ink tabular-nums">{money(totals.spent)}</span>
          <span className="text-caption text-ink-muted">{t("Across the months with a budget")}</span>
        </Card>
        <Card padding="none" className="flex flex-col gap-1 px-5 py-4">
          <span className="text-small text-ink-muted">{left < 0 ? t("Over budget in total") : t("Left in total")}</span>
          <span className={cn("text-[24px] font-bold tabular-nums", left < 0 ? "text-expense" : "text-income")}>{money(left)}</span>
          <span className="text-caption text-ink-muted">{totals.over > 0 ? t("{over} of {count} months went over", { over: formatCount(totals.over, fmt), count: formatCount(totals.withBudget, fmt) }) : t("No month went over")}</span>
        </Card>
      </div>

      <ListCard
        label={t("Monthly budget")}
        header={
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 md:px-5">
            <h2 className="text-title font-semibold text-ink">{t("Monthly budget")}</h2>
            <Button size="sm" onClick={() => onSet(currentKey)}>
              <Plus aria-hidden="true" />
              {t("Set budget")}
            </Button>
          </div>
        }
      >
        <ListHead columns={COLUMNS} className="gap-x-3 border-t md:px-5">
          <ListHeadCell>{t("Month")}</ListHeadCell>
          <ListHeadCell align="end">{t("Budget")}</ListHeadCell>
          <ListHeadCell align="end">{t("Spent")}</ListHeadCell>
          <ListHeadCell align="end">{t("Left / Over")}</ListHeadCell>
          <ListHeadCell>{t("Used")}</ListHeadCell>
          <ListHeadCell align="end">{t("Action")}</ListHeadCell>
        </ListHead>
        {rows.map((row) => {
          const closed = closedFor(data.history, row.key, data.startDay);
          const used = row.budget ? (row.spent / row.budget) * 100 : null;
          const over = row.budget !== null && row.spent > row.budget;
          const tone = over ? "bg-expense-fill" : used !== null && warnAt !== null && used >= warnAt ? "bg-warning-fill" : "bg-emerald";
          return (
            <ListRow key={row.key} columns={COLUMNS} className="min-h-12 grid-cols-[minmax(0,1fr)_auto_104px] gap-x-3 tabular-nums md:px-5">
              <ListCell className="flex items-center gap-2">
                <span className="font-semibold text-ink">{monthName(row.key, fmt, "long", true)}</span>
                {row.current ? (
                  <Chip tone="insights" size="sm">
                    {t("Current")}
                  </Chip>
                ) : row.future ? (
                  <Chip tone="info" size="sm">
                    {t("Next")}
                  </Chip>
                ) : closed ? (
                  <Chip tone="neutral" size="sm">
                    {t("Closed")}
                  </Chip>
                ) : null}
              </ListCell>
              <ListCell align="end" className={row.budget === null ? "text-ink-faint" : "text-ink"}>
                {row.budget === null ? t("Not set") : money(row.budget)}
              </ListCell>
              <ListCell align="end" className="hidden text-ink-2 md:block">
                {row.future ? "—" : money(row.spent)}
              </ListCell>
              <ListCell align="end" className={cn("hidden font-semibold md:block", row.budget === null || row.future ? "text-input" : over ? "text-expense" : "text-income")}>
                {row.budget === null || row.future ? "—" : over ? `− ${money(row.spent - row.budget)}` : money(row.budget - row.spent)}
              </ListCell>
              <ListCell className="hidden items-center gap-2.5 md:flex">
                {used === null || row.future ? (
                  <span className="text-input">—</span>
                ) : (
                  <>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-valuenow={Math.round(Math.min(used, 100))} aria-valuemin={0} aria-valuemax={100} aria-label={t("Budget used")}>
                      <span className={cn("block h-full rounded-full", tone)} style={{ width: `${Math.min(100, used)}%` }} />
                    </span>
                    <span className={cn("w-11 text-right text-caption font-semibold", over ? "text-expense" : "text-ink-2")}>{formatCount(Math.round(used), fmt)}%</span>
                  </>
                )}
              </ListCell>
              <ListRowActions className="flex justify-end">
                <Button variant={row.budget === null ? "soft" : "ghost"} size="xs" onClick={() => onSet(row.key)}>
                  {row.budget === null ? t("Set budget") : t("Edit")}
                </Button>
              </ListRowActions>
            </ListRow>
          );
        })}
      </ListCard>
    </div>
  );
}
