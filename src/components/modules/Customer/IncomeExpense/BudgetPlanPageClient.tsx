"use client";

import { CalendarDays, Pencil, Search, Target, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { monthLabel } from "@/components/modules/Customer/Budget/MonthSwitcher";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import ProgressBar from "@/components/smartly/ProgressBar";
import type { MonthlyPlan } from "@/lib/customer/api";
import { deleteMonthlyPlanAction } from "@/lib/customer/budgetActions";
import { formatCurrency } from "@/lib/customer/currency";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { plural } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BudgetDialog, type BudgetDialogState } from "./BudgetDialog";
import { budgetState, daysLeft, monthHref, percentOf, planMatches, type BudgetState } from "./ieFigures";

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

const STATE: Record<BudgetState, { bar: "income" | "warning" | "expense"; text: string }> = {
  ON_TRACK: { bar: "income", text: "text-income" },
  NEAR_LIMIT: { bar: "warning", text: "text-warning" },
  OVER: { bar: "expense", text: "text-expense" },
};

const COLUMNS = "md:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_120px_96px]";

// The board's round icon buttons: edit in ink, delete in red.
const ROW_ACTION = "flex size-11 shrink-0 items-center justify-center rounded-full disabled:opacity-50";

const monthKey = (m: { month: number; year: number }) => m.year * 12 + m.month;

// Income & Expense > Budget Planning: the month picked, the savings its plan
// makes for, and every month planned so far, to search, edit or delete.
export function BudgetPlanPageClient({ businessId, currency, canManage, plan, month, year, current, plans, today }: BudgetPlanPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSwitching, startSwitch] = useTransition();
  const [editing, setEditing] = useState<BudgetDialogState | null>(null);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);

  const goTo = (nextMonth: number, nextYear: number) =>
    startSwitch(() => router.push(monthHref(pathname, Object.fromEntries(searchParams.entries()), nextMonth, nextYear, current)));

  const earned = Number(plan?.earned ?? 0);
  const spent = Number(plan?.spent ?? 0);
  const target = plan?.incomeTarget ? Number(plan.incomeTarget) : null;
  const budget = plan?.expenseBudget ? Number(plan.expenseBudget) : null;
  const left = daysLeft(year, month, today);

  const open = (m: number, y: number, figures?: { incomeTarget: string | null; expenseBudget: string | null }) =>
    setEditing({ month: m, year: y, incomeTarget: figures?.incomeTarget ? String(Number(figures.incomeTarget)) : "", expenseBudget: figures?.expenseBudget ? String(Number(figures.expenseBudget)) : "" });
  // The dialog's years: the years planned and a year either side of today.
  const years = [...new Set([current.year - 1, current.year, current.year + 1, ...plans.map((p) => p.year)])].sort();

  // The month picker: every month planned, this month and the one on show,
  // newest first.
  const months = [...new Map([...plans, current, { month, year }].map((m) => [monthKey(m), { month: m.month, year: m.year }])).values()].sort((a, b) => monthKey(b) - monthKey(a));

  const rows = plans.filter((row) =>
    planMatches(query, [monthLabel(row.month, row.year, fmt), money(row.earned), money(row.spent), row.earned, row.spent, ...[row.incomeTarget, row.expenseBudget].flatMap((v) => (v ? [money(v), v] : []))]),
  );

  async function remove(row: MonthlyPlan, label: string) {
    if (!row.id) return;
    const confirmed = await confirm({
      title: "Delete plan@@budget",
      message: t("Delete the plan for {month}? Its income target and expense budget go; the month's transactions stay.", { month: label }),
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    setDeletingId(row.id);
    try {
      const result = await deleteMonthlyPlanAction(businessId, row.id);
      if (result.success) {
        toast.success(t("Plan deleted@@budget"));
        router.refresh();
      } else {
        toast.error(t(result.message ?? "Failed to delete the plan"));
      }
    } catch {
      // No answer at all (offline): nothing changed.
      toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <PageFrame>
      <PageHeader
        title={t("Monthly Income and Expense Planning")}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={cn("relative inline-flex w-55 max-sm:flex-1", isSwitching && "opacity-60")}>
              <CalendarDays className="pointer-events-none absolute top-1/2 left-3.5 z-1 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <NativeSelect
                aria-label={t("Month")}
                value={String(monthKey({ month, year }))}
                onChange={(event) => {
                  const picked = months.find((m) => String(monthKey(m)) === event.target.value);
                  if (picked) goTo(picked.month, picked.year);
                }}
                frameClassName="w-full"
                className="rounded-full pl-9.5 font-semibold"
              >
                {months.map((m) => (
                  <option key={monthKey(m)} value={monthKey(m)}>
                    {monthLabel(m.month, m.year, fmt)}
                  </option>
                ))}
              </NativeSelect>
            </span>
            {canManage && (
              <Button onClick={() => open(month, year, plan ?? undefined)} className="rounded-full px-4.5">
                <Target strokeWidth={2.25} aria-hidden="true" />
                {t("Set monthly budget")}
              </Button>
            )}
          </div>
        }
      />

      <Card padding="none" aria-busy={isSwitching || undefined} className={cn("grid transition-opacity sm:grid-cols-3", isSwitching && "opacity-60")}>
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
          <span className="text-[20px] font-bold text-ink tabular-nums">{left === 0 ? t("Month closed") : plural(t, left, "{count} day", "{count} days", undefined, fmt)}</span>
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden" role="region" aria-label={t("Monthly plans")}>
        {plans.length === 0 ? (
          <p className="px-6 py-8 text-center text-small text-ink-muted">{t("No month has a plan yet. Set this month's budget to start.")}</p>
        ) : (
          <>
            <div className="border-b border-divider px-6 py-3">
              <Input type="search" size="sm" value={query} onChange={(event) => setQuery(event.target.value)} leading={<Search />} placeholder={t("Search month or amount…")} aria-label={t("Search monthly plans")} />
            </div>
            <div className={cn("hidden items-center gap-x-6 border-b border-divider bg-table-head px-6 py-2.5 text-caption font-semibold text-ink-muted md:grid", COLUMNS)}>
              <span>{t("Month")}</span>
              <span>{t("Income vs target")}</span>
              <span>{t("Expense vs budget")}</span>
              <span className="text-right">{t("Saved")}</span>
              <span className="text-right">{t("Actions")}</span>
            </div>
            {rows.length === 0 ? (
              <p className="px-6 py-8 text-center text-small text-ink-muted">{t("No plan matches “{query}”.", { query: query.trim() })}</p>
            ) : (
              <ul>
                {rows.map((row) => {
                  const rowTarget = row.incomeTarget ? Number(row.incomeTarget) : null;
                  const rowBudget = row.expenseBudget ? Number(row.expenseBudget) : null;
                  const rowEarned = Number(row.earned);
                  const rowSpent = Number(row.spent);
                  const ip = percentOf(rowEarned, rowTarget);
                  const ep = percentOf(rowSpent, rowBudget);
                  const rowState = STATE[budgetState(ep)];
                  const isCurrent = row.month === current.month && row.year === current.year;
                  const isFuture = monthKey(row) > monthKey(current);
                  const label = monthLabel(row.month, row.year, fmt);
                  return (
                    <li
                      key={`${row.year}-${row.month}`}
                      className={cn(
                        "grid grid-cols-2 items-center gap-x-6 gap-y-3 border-b border-divider px-6 py-4 last:border-b-0 md:h-18 md:py-0",
                        COLUMNS,
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
                      <span className="flex justify-end gap-1">
                        {canManage && (
                          <>
                            <button type="button" onClick={() => open(row.month, row.year, row)} aria-label={t("Edit {month} plan", { month: label })} title={t("Edit")} className={cn(ROW_ACTION, "text-ink-2 hover:bg-surface-sunken")}>
                              <Pencil className="size-4.25" aria-hidden="true" />
                            </button>
                            {row.id && (
                              <button
                                type="button"
                                onClick={() => remove(row, label)}
                                disabled={deletingId === row.id}
                                aria-label={t("Delete {month} plan", { month: label })}
                                title={t("Delete")}
                                className={cn(ROW_ACTION, "text-expense hover:bg-expense-soft")}
                              >
                                <Trash2 className="size-4.25" aria-hidden="true" />
                              </button>
                            )}
                          </>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
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
      {confirmDialog}
    </PageFrame>
  );
}
