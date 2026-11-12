"use client";

import { Info, Pencil } from "lucide-react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { ListCard, ListCell, ListHead, ListHeadCell, ListRow, ListRowActions } from "@/components/smartly/list";
import { formatCurrency } from "@/lib/customer/currency";
import { groupMonthOf } from "@/lib/customer/groupDisplay";
import { budgetMonths, budgetPageMonths, budgetTotals, categoryRows, closedFor, firstMonthOf, spendByMonthKey } from "@/lib/customer/groupFamily";
import { monthName } from "@/lib/customer/insights";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useState } from "react";
import type { GroupExpenseCategoryOption } from "@/lib/customer/api";
import { BudgetWarnDialog } from "./BudgetWarnDialog";
import { CategoryLimitDialog } from "./CategoryLimitDialog";
import { cn } from "@/lib/utils";
import { CategoryTile } from "./GroupBits";
import type { GroupPageData } from "./groupTypes";

// Month, budget, spent, left or over, used, action.
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_130px_130px_130px_170px_104px]";

interface GroupBudgetTabProps {
  data: GroupPageData;
  onSet: (key: string) => void;
}

// The group's budget (the v16 GroupBudget board): this month against its
// budget and the warning line, its spending by category, the last six months
// as bars, then every month from next back to the first.
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

  // The month on top (this one), by category, and the last six months.
  // The month picked in the header (this one unless another is picked).
  const shownKey = data.range.key;
  const now = rows.find((row) => row.key === shownKey) ?? rows.find((row) => row.current);
  const nowUsed = now?.budget ? (now.spent / now.budget) * 100 : null;
  const nowOver = !!now?.budget && now.spent > now.budget;
  const nowTone = nowOver ? "bg-expense-fill" : nowUsed !== null && warnAt !== null && nowUsed >= warnAt ? "bg-warning-fill" : "bg-emerald";
  // Every category in use or still offered, biggest spending first.
  const spentBy = categoryRows(data.expenses, data.categories);
  const cats = [...spentBy.filter((row) => row.amount > 0), ...data.categories.filter((c) => !c.hidden && !spentBy.some((row) => row.name === c.name && row.amount > 0)).map((c) => ({ name: c.name, amount: 0, share: 0 }))];
  const catTotal = cats.reduce((sum, row) => sum + row.amount, 0);
  const optionOf = (name: string) => data.categories.find((c) => c.name === name);
  const limitOf = (name: string) => Number(optionOf(name)?.monthlyLimit ?? 0);
  const limitTotal = cats.reduce((sum, row) => sum + limitOf(row.name), 0);
  const limited = cats.filter((row) => limitOf(row.name) > 0).length;
  const [limiting, setLimiting] = useState<GroupExpenseCategoryOption | null>(null);
  const [warnOpen, setWarnOpen] = useState(false);
  const isAdmin = data.role === "OWNER";
  const LIMIT_COLUMNS = "md:grid-cols-[minmax(0,1fr)_110px_120px_minmax(0,1.3fr)_40px]";
  const last6 = [...rows].filter((row) => !row.future).slice(0, 6).reverse();
  const peak = Math.max(1, ...last6.map((row) => Math.max(row.spent, row.budget ?? 0)));
  const avgSpent = last6.length ? last6.reduce((sum, row) => sum + row.spent, 0) / last6.length : 0;
  const withBudget = last6.filter((row) => row.budget !== null);
  const avgBudget = withBudget.length ? withBudget.reduce((sum, row) => sum + (row.budget ?? 0), 0) / withBudget.length : null;
  const overCount = withBudget.filter((row) => row.spent > (row.budget ?? 0)).length;
  const monthLong = monthName(shownKey, fmt, "long", true);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <span className="flex items-center gap-2.5">
          <h2 className="text-[19px] font-semibold text-ink">{t("Monthly budget")}</h2>
          <Chip tone="mint" className="px-2.5">
            {t("Current month")}
          </Chip>
        </span>
        <Button onClick={() => onSet(shownKey)}>
          <Pencil aria-hidden="true" />
          {now?.budget ? t("Edit budget") : t("Set budget")}
        </Button>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card padding="none" className="flex flex-col gap-3.5 px-5 py-4.5">
            <h3 className="text-[17px] font-semibold text-ink">{t("Budget for {month}", { month: monthLong })}</h3>
            <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-line">
              <BudgetFigure label={t("Budget")} value={now?.budget ? money(now.budget) : t("Not set")} tone={now?.budget ? "text-ink" : "text-ink-faint"} />
              <BudgetFigure label={t("Spent")} value={money(now?.spent ?? 0)} tone="text-ink" />
              <BudgetFigure label={nowOver ? t("Over") : t("Left")} value={now?.budget ? money(now.budget - now.spent) : "—"} tone={nowOver ? "text-expense" : "text-income"} last />
            </div>
            {now?.budget ? (
              <>
                <span className="relative h-3 overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-valuenow={Math.round(Math.min(nowUsed ?? 0, 100))} aria-valuemin={0} aria-valuemax={100} aria-label={t("Budget used")}>
                  <span className={cn("block h-full rounded-full", nowTone)} style={{ width: `${Math.min(100, nowUsed ?? 0)}%` }} />
                  {warnAt !== null && <span aria-hidden="true" className="absolute top-0 h-full w-0.5 bg-ink-muted" style={{ left: `${warnAt}%` }} />}
                </span>
                <div className="flex flex-wrap items-center justify-between gap-2 text-small">
                  <span className={cn("font-semibold", nowOver ? "text-expense" : "text-emerald")}>{t("{percent}% of the budget used", { percent: formatCount(Math.round((nowUsed ?? 0) * 10) / 10, fmt) })}</span>
                  <span className="flex items-center gap-2 text-ink-muted">
                    {warnAt !== null ? t("Warns at {percent}%", { percent: formatCount(warnAt, fmt) }) : t("No warning")}
                    <Button variant="secondary" size="xs" onClick={() => setWarnOpen(true)}>
                      {t("Change")}
                    </Button>
                  </span>
                </div>
              </>
            ) : (
              <p className="text-small text-ink-muted">{t("No budget set for {month}.", { month: monthLong })}</p>
            )}
          </Card>

          <Card padding="none" className="flex flex-col overflow-hidden">
            <div className="flex flex-col gap-0.5 px-5 pt-4 pb-3">
              <h3 className="text-[17px] font-semibold text-ink">{t("By category")}</h3>
              <p className="text-caption text-ink-muted">{t("Limits are optional and stay the same every month. Red means a category went over its limit.")}</p>
            </div>
            <div className={cn("hidden gap-x-4 border-t border-line bg-table-head px-5 py-2.25 text-caption font-semibold text-ink-muted md:grid", LIMIT_COLUMNS)}>
              <span>{t("Category")}</span>
              <span className="text-right">{t("Monthly limit")}</span>
              <span className="text-right">{t("Spent so far")}</span>
              <span>{t("Used")}</span>
              <span />
            </div>
            {cats.length === 0 && <p className="border-t border-divider px-5 py-4 text-small text-ink-muted">{t("No spending in {month} yet.", { month: monthLong })}</p>}
            {cats.map((row) => (
              <div key={row.name} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-t border-divider px-5 py-2.5 text-body tabular-nums", LIMIT_COLUMNS)}>
                <span className="flex min-w-0 items-center gap-2.5">
                  <CategoryTile name={row.name} categories={data.categories} size={28} />
                  <span className="truncate font-medium text-ink">{row.name}</span>
                </span>
                <span className={cn("text-right max-md:hidden", limitOf(row.name) > 0 ? "text-ink" : "text-ink-faint")}>{limitOf(row.name) > 0 ? money(limitOf(row.name)) : "–"}</span>
                <span className={cn("text-right font-semibold", limitOf(row.name) > 0 && row.amount > limitOf(row.name) ? "text-expense" : row.amount > 0 ? "text-ink" : "text-ink-faint")}>{money(row.amount)}</span>
                {(() => {
                  const limit = limitOf(row.name);
                  const used = limit > 0 ? Math.round((row.amount / limit) * 1000) / 10 : 0;
                  const over = limit > 0 && row.amount > limit;
                  const near = limit > 0 && !over && warnAt !== null && used >= warnAt;
                  return (
                    <span className="hidden min-w-0 flex-col gap-1 md:flex">
                      {limit > 0 && (
                        <span className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                          <span className={cn("block h-full rounded-full", over ? "bg-expense-fill" : near ? "bg-warning-fill" : "bg-emerald")} style={{ width: `${Math.min(100, used)}%` }} />
                        </span>
                      )}
                      <span className={cn("truncate text-caption", over ? "font-semibold text-expense" : near ? "font-semibold text-warning" : "text-ink-muted")}>
                        {limit > 0
                          ? over
                            ? t("{amount} over · {percent}%", { amount: money(row.amount - limit), percent: formatCount(used, fmt) })
                            : t("{amount} left · {percent}%", { amount: money(limit - row.amount), percent: formatCount(used, fmt) })
                          : row.amount > 0
                            ? t("{percent}% of {month}’s spending", { percent: formatCount(Math.round(row.share), fmt), month: monthName(shownKey, fmt, "long") })
                            : t("Nothing spent")}
                      </span>
                    </span>
                  );
                })()}
                <span className="flex justify-end max-md:hidden">
                  {isAdmin && optionOf(row.name) && (
                    <button type="button" onClick={() => setLimiting(optionOf(row.name) ?? null)} aria-label={t("Monthly limit for {name}", { name: row.name })} className="flex size-8.5 items-center justify-center rounded-[9px] text-ink-muted hover:bg-emerald-wash hover:text-emerald">
                      <Pencil className="size-3.75" aria-hidden="true" />
                    </button>
                  )}
                </span>
              </div>
            ))}
            {cats.length > 0 && (
              <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-t border-divider bg-hover px-5 py-3 text-body font-semibold tabular-nums", LIMIT_COLUMNS)}>
                <span className="text-ink">{t("Total")}</span>
                <span className="text-right text-ink max-md:hidden">{limitTotal > 0 ? money(limitTotal) : "–"}</span>
                <span className="text-right text-ink">{money(catTotal)}</span>
                <span className="max-md:hidden" />
                <span className="max-md:hidden" />
              </div>
            )}
            <p className="flex items-center gap-2 border-t border-divider px-5 py-3 text-[12.5px] text-ink-soft">
              <Info className="size-3.5 shrink-0" aria-hidden="true" />
              {limited === 0 ? t("No category has a limit yet. The total budget still works on its own.") : t(limited === 1 ? "{count} category has a limit, {amount} in all." : "{count} categories have a limit, {amount} in all.", { count: formatCount(limited, fmt), amount: money(limitTotal) })}
            </p>
          </Card>
        </div>

        <Card padding="none" className="flex flex-col gap-3 px-5 py-4.5">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-[17px] font-semibold text-ink">{t("Last 6 months")}</h3>
            <p className="text-caption text-ink-muted">{t("Budget against what was spent")}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-caption text-ink-muted">
            <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-sm bg-surface-sunken" />{t("Budget")}</span>
            <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-sm bg-emerald" />{t("Spent")}</span>
            <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-sm bg-warning-fill" />{t("Near limit")}</span>
            <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-sm bg-expense-fill" />{t("Over")}</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5" role="list" aria-label={t("Last 6 months")}>
            {last6.map((row) => {
              const used = row.budget ? (row.spent / row.budget) * 100 : null;
              const tone = row.budget !== null && row.spent > row.budget ? "bg-expense-fill" : used !== null && warnAt !== null && used >= warnAt ? "bg-warning-fill" : "bg-emerald";
              return (
                <button key={row.key} type="button" role="listitem" onClick={() => onSet(row.key)} aria-label={t("{month}: {spent} spent of {budget}", { month: monthName(row.key, fmt, "long", true), spent: money(row.spent), budget: row.budget === null ? t("Not set") : money(row.budget) })} className={cn("flex flex-col items-center gap-1 rounded-lg border px-0.5 pt-1.5 pb-1 hover:bg-surface-sunken", row.current ? "border-emerald" : "border-transparent")}>
                  <span className="text-[10.5px] font-semibold text-ink-2 tabular-nums">{toLocaleDigits(row.spent >= 1000 ? `${Math.round(row.spent / 100) / 10}k` : String(Math.round(row.spent)), fmt)}</span>
                  <span className="flex h-32 items-end gap-0.5">
                    <span className="w-2.5 rounded-t-sm bg-surface-sunken" style={{ height: `${((row.budget ?? 0) / peak) * 100}%` }} />
                    <span className={cn("w-2.5 rounded-t-sm", tone)} style={{ height: `${(row.spent / peak) * 100}%` }} />
                  </span>
                  <span className={cn("text-caption", row.current ? "font-semibold text-ink" : "text-ink-2")}>{monthName(row.key, fmt, "short")}</span>
                  <span className={cn("text-[11px] tabular-nums", tone === "bg-expense-fill" ? "text-expense" : tone === "bg-warning-fill" ? "text-warning" : "text-emerald")}>{used === null ? "—" : `${formatCount(Math.round(used * 10) / 10, fmt)}%`}</span>
                </button>
              );
            })}
          </div>
          <dl className="flex flex-col gap-1.5 rounded-xl bg-strip px-4 py-3 text-small tabular-nums">
            <div className="flex justify-between gap-3"><dt className="text-ink-2">{t("Average spent a month")}</dt><dd className="font-semibold text-ink">{money(avgSpent)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-2">{t("Average budget a month")}</dt><dd className="font-semibold text-ink">{avgBudget === null ? t("Not set") : money(avgBudget)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-2">{t("Months over budget")}</dt><dd className={cn("font-semibold", overCount > 0 ? "text-expense" : "text-income")}>{t("{count} of {total}", { count: formatCount(overCount, fmt), total: formatCount(withBudget.length, fmt) })}</dd></div>
          </dl>
          <p className="text-caption text-ink-muted">{t("Tap a month to open it.")}</p>
        </Card>
      </div>

      <ListCard
        label={t("Monthly budget")}
        header={
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 md:px-5">
            <h2 className="text-title font-semibold text-ink">{t("Every month")}</h2>
            <span className="text-small text-ink-muted">{totals.over > 0 ? t("{over} of {count} months went over", { over: formatCount(totals.over, fmt), count: formatCount(totals.withBudget, fmt) }) : t("No month went over")}</span>
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
      <BudgetWarnDialog open={warnOpen} onClose={() => setWarnOpen(false)} businessId={data.businessId} currency={data.currency} current={warnAt} budget={now?.budget ?? null} />
      <CategoryLimitDialog businessId={data.businessId} currency={data.currency} categories={data.categories} category={limiting} spent={limiting ? (cats.find((row) => row.name === limiting.name)?.amount ?? 0) : 0} onClose={() => setLimiting(null)} />
    </div>
  );
}

function BudgetFigure({ label, value, tone, last = false }: { label: string; value: string; tone: string; last?: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5 px-4 py-3", !last && "border-r border-line", last && "bg-strip")}>
      <span className="text-small text-ink-muted">{label}</span>
      <span className={cn("truncate text-[24px] font-bold tabular-nums", tone)}>{value}</span>
    </div>
  );
}
