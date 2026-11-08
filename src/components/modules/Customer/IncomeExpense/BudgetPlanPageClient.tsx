"use client";

import { Pencil, Search, Target, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { monthLabel } from "@/components/modules/Customer/Budget/MonthSwitcher";
import { PeriodPicker } from "@/components/modules/Customer/Shared/PeriodPicker";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Input from "@/components/smartly/form/Input";
import { LIST_ROW_ACTION, LIST_ROW_DELETE } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { MonthlyPlan } from "@/lib/customer/api";
import { deleteMonthlyPlanAction, saveMonthlyPlanAction } from "@/lib/customer/budgetActions";
import { formatCurrency, formatGrouped, formatSignedCurrency } from "@/lib/customer/currency";
import type { YearMonth } from "@/lib/customer/period";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { plural } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BudgetDialog, type BudgetDialogState } from "./BudgetDialog";
import { IEConfirmDialog } from "./IEConfirmDialog";
import { budgetHref, budgetState, type BudgetState, daysLeft, firstFreeMonth, percentOf, planMatches, transactionsHref } from "./ieFigures";

interface BudgetPlanPageClientProps {
  businessId: string;
  currency: string;
  canManage: boolean;
  // Every month planned, newest first, each with its income and spending.
  plans: MonthlyPlan[];
  // The month the figures are of; null when nothing is planned yet.
  shown: YearMonth | null;
  // A month asked for that has no plan (the "no plan yet" line).
  missing: YearMonth | null;
  current: YearMonth;
  today: string;
}

// The board's expense bar by how much of the budget is spent: green, orange
// from 80%, red past it.
const STATE: Record<BudgetState, { bar: string; text: string }> = {
  ON_TRACK: { bar: "bg-success", text: "text-tint-green-ink" },
  NEAR_LIMIT: { bar: "bg-orange-fill", text: "text-orange" },
  OVER: { bar: "bg-expense-fill", text: "text-expense" },
};

const COLUMNS = "md:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_110px_84px]";

// A month's status pill: this month in the emerald tint, a past one grey,
// one still to come blue.
const STATUS = {
  current: { label: "Current month", tone: "bg-mint-50 text-emerald" },
  closed: { label: "Closed@@month", tone: "bg-surface-sunken text-ink-muted" },
  upcoming: { label: "Upcoming", tone: "bg-info-50 text-tint-blue-ink" },
} as const;

const monthKey = (m: YearMonth) => m.year * 12 + m.month;
const same = (a: YearMonth | null, b: YearMonth) => !!a && a.month === b.month && a.year === b.year;

// How long the toast offers Undo after a plan is deleted.
const UNDO_MS = 6000;

// A plan's 8px bar: its share of the target or budget, filled to 100%.
function PlanBar({ value, fill, label }: { value: number; fill: string; label: string }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <span role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(width)} className="block h-2 overflow-hidden rounded-full bg-surface-sunken">
      <span className={cn("block h-full rounded-full", fill)} style={{ width: `${width}%` }} />
    </span>
  );
}

// Income & Expense > Budget Planning (design: Budget): the month shown's
// planned savings, what is saved so far, what is left to spend and the days
// left, then every month planned -- picked, searched, edited or deleted.
export function BudgetPlanPageClient({ businessId, currency, canManage, plans, shown, missing, current, today }: BudgetPlanPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [isSwitching, startSwitch] = useTransition();
  const [editing, setEditing] = useState<BudgetDialogState | null>(null);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<MonthlyPlan | null>(null);
  const [isDeleting, startDeleting] = useTransition();
  // The "no plan yet" line, until closed (for that month).
  const [closedMissing, setClosedMissing] = useState<number | null>(null);
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  // A minus figure with its real minus sign ("− ৳ 2,500"); none for plus.
  const signedMoney = (value: number) => (value < 0 ? formatSignedCurrency(value, currency, fmt) : money(value));

  const goTo = (m: YearMonth) => startSwitch(() => router.push(budgetHref({ kind: "month", ...m }), { scroll: false }));

  const plan = shown ? plans.find((row) => same(shown, row)) : undefined;
  const statusOf = (m: YearMonth) => (same(current, m) ? STATUS.current : monthKey(m) < monthKey(current) ? STATUS.closed : STATUS.upcoming);

  const openNew = (m: YearMonth) => setEditing({ month: m.month, year: m.year, incomeTarget: "", expenseBudget: "", existing: false });
  const openEdit = (row: MonthlyPlan) =>
    setEditing({ month: row.month, year: row.year, incomeTarget: row.incomeTarget ? String(Number(row.incomeTarget)) : "", expenseBudget: row.expenseBudget ? String(Number(row.expenseBudget)) : "", existing: true });
  // "Set monthly budget" starts on the first month from this one that has no
  // plan yet (the board's).
  const setNew = () => openNew(firstFreeMonth(plans, current));

  const rows = plans.filter((row) =>
    planMatches(query, [
      monthLabel(row.month, row.year, fmt),
      t(statusOf(row).label),
      money(row.earned),
      money(row.spent),
      row.earned,
      row.spent,
      ...[row.incomeTarget, row.expenseBudget].flatMap((v) => (v ? [money(v), v] : [])),
    ]),
  );

  function remove() {
    const row = deleting;
    if (!row?.id || isDeleting) return;
    const id = row.id;
    startDeleting(async () => {
      try {
        const result = await deleteMonthlyPlanAction(businessId, id);
        if (!result.success) {
          toast.error(t(result.message ?? "Failed to delete the plan"));
          return;
        }
        setDeleting(null);
        router.refresh();
        // Undo saves the same targets again.
        const saved = { month: row.month, year: row.year, incomeTarget: Number(row.incomeTarget ?? 0), expenseBudget: Number(row.expenseBudget ?? 0) };
        toast.success(t("Plan deleted@@budget"), {
          duration: UNDO_MS,
          action: {
            label: t("Undo"),
            onClick: async () => {
              const back = await saveMonthlyPlanAction(businessId, saved);
              if (back.success) {
                toast.success(t("Plan restored"));
                router.refresh();
              } else {
                toast.error(t(back.message ?? "Failed to save the budget"));
              }
            },
          },
        });
      } catch {
        // No answer at all (offline): nothing changed.
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  const missingOn = missing !== null && closedMissing !== monthKey(missing);
  const emptyButton = "mt-1 h-10 px-4";

  return (
    <PageFrame className="leading-[normal]">
      <PageHeader
        title={t("Monthly Income and Expense Planning")}
        className="md:items-center"
        actions={
          <>
            {shown && (
              <PeriodPicker
                period={{ kind: "month", ...shown }}
                today={today}
                activeMonths={plans.map((row) => ({ month: row.month, year: row.year, count: 1 }))}
                modes={["month"]}
                greyNote="Greyed-out months have no plan yet."
                onPick={(picked) => picked.kind === "month" && goTo(picked)}
                busy={isSwitching}
              />
            )}
            {canManage && (
              <Button size="lg" onClick={setNew} className="gap-1.5 px-4.5">
                <Target strokeWidth={2.25} aria-hidden="true" />
                {t("Set monthly budget")}
              </Button>
            )}
          </>
        }
      />

      {missingOn && missing && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-[14px] border border-orange-fill/30 bg-orange-soft/50 py-3 pr-3 pl-4.5 text-body text-orange">
          <span className="min-w-0 flex-1">
            {t("There is no plan for {month} yet. Showing {shown}.", { month: monthLabel(missing.month, missing.year, fmt), shown: shown ? monthLabel(shown.month, shown.year, fmt) : "" })}
          </span>
          {canManage && (
            <Button size="sm" onClick={() => openNew(missing)} className="px-3.5 text-[13.5px] shadow-none">
              {t("Set a plan for {month}", { month: monthLabel(missing.month, missing.year, fmt) })}
            </Button>
          )}
          <button type="button" onClick={() => setClosedMissing(monthKey(missing))} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-orange-soft">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {plan && shown && <PlanFigures plan={plan} shown={shown} current={current} today={today} money={money} signedMoney={signedMoney} busy={isSwitching} />}

      <Card padding="none" className="overflow-hidden" role="region" aria-label={t("Monthly plans")}>
        <div className="border-b border-line px-4 py-3 md:px-6">
          <Input type="search" size="sm" value={query} onChange={(event) => setQuery(event.target.value)} leading={<Search />} placeholder={t("Search month or amount…")} aria-label={t("Search month or amount…")} className="text-small" />
        </div>
        <div className={cn("hidden items-center gap-x-5 border-b border-line bg-table-head px-6 py-2.5 text-caption font-semibold text-ink-muted md:grid", COLUMNS)}>
          <span>{t("Month")}</span>
          <span>{t("Income vs target")}</span>
          <span>{t("Expense vs budget")}</span>
          <span className="text-right">{t("Saved")}</span>
          <span className="text-right">{t("Actions")}</span>
        </div>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 px-6 py-14 text-center">
            <span className="text-title font-semibold text-ink">{t(plans.length === 0 ? "No monthly plans yet" : "No plan matches your search")}</span>
            <span className="max-w-110 text-body text-ink-muted">{t(plans.length === 0 ? "Set an income target and an expense budget for a month to track it here." : "Try a month name like \"August\" or an amount.")}</span>
            {plans.length === 0 ? (
              canManage && (
                <Button variant="secondary" onClick={setNew} className={emptyButton}>
                  {t("Set monthly budget")}
                </Button>
              )
            ) : (
              <Button variant="secondary" onClick={() => setQuery("")} className={emptyButton}>
                {t("Clear search")}
              </Button>
            )}
          </div>
        ) : (
          <ul>
            {rows.map((row) => {
              const target = row.incomeTarget ? Number(row.incomeTarget) : null;
              const budget = row.expenseBudget ? Number(row.expenseBudget) : null;
              const earned = Number(row.earned);
              const spent = Number(row.spent);
              const ip = percentOf(earned, target);
              const ep = percentOf(spent, budget);
              const tone = STATE[budgetState(ep)];
              const status = statusOf(row);
              const on = same(shown, row);
              const label = monthLabel(row.month, row.year, fmt);
              return (
                <li
                  key={`${row.year}-${row.month}`}
                  className={cn("relative grid grid-cols-2 items-center gap-x-5 gap-y-3 border-b border-divider px-4 py-4 last:border-b-0 md:h-18 md:px-6 md:py-0", COLUMNS, on ? "bg-emerald-wash" : "hover:bg-hover")}
                >
                  {on && <span aria-hidden="true" className="absolute top-3.5 bottom-3.5 left-0 w-0.75 rounded-r-[3px] bg-emerald" />}
                  {/* The month picks the row; its overlay makes the whole row the target. */}
                  <button type="button" aria-pressed={on} onClick={() => !on && goTo(row)} className="flex flex-col items-start gap-0.75 text-left after:absolute after:inset-0 max-md:col-span-2">
                    <span className="text-body font-semibold text-ink">{label}</span>
                    <span className={cn("inline-flex rounded-full px-2 py-px text-[11.5px] font-semibold", status.tone)}>{t(status.label)}</span>
                  </button>
                  <span className="flex min-w-0 flex-col gap-1.5 max-md:col-span-2">
                    <span className="flex justify-between gap-2 text-small whitespace-nowrap tabular-nums">
                      <span className="truncate text-ink-2">{target === null ? money(earned) : `${money(earned)} / ${formatGrouped(target, currency, fmt)}`}</span>
                      {target !== null && <span className="font-semibold text-tint-green-ink">{toLocaleDigits(`${ip}%`, fmt)}</span>}
                    </span>
                    <PlanBar value={ip} fill="bg-success" label={t("Income vs target")} />
                  </span>
                  <span className="flex min-w-0 flex-col gap-1.5 max-md:col-span-2">
                    <span className="flex justify-between gap-2 text-small whitespace-nowrap tabular-nums">
                      <span className="truncate text-ink-2">{budget === null ? money(spent) : `${money(spent)} / ${formatGrouped(budget, currency, fmt)}`}</span>
                      {budget !== null && <span className={cn("font-semibold", tone.text)}>{toLocaleDigits(`${ep}%`, fmt)}</span>}
                    </span>
                    <PlanBar value={ep} fill={tone.bar} label={t("Expense vs budget")} />
                  </span>
                  <span className={cn("text-body font-semibold tabular-nums md:text-right", earned - spent < 0 ? "text-expense" : "text-ink")}>{signedMoney(earned - spent)}</span>
                  <span className="relative z-10 flex justify-end gap-1.5">
                    {canManage && (
                      <>
                        <button type="button" onClick={() => openEdit(row)} aria-label={t("Edit {month} plan", { month: label })} title={t("Edit")} className={LIST_ROW_ACTION}>
                          <Pencil aria-hidden="true" />
                        </button>
                        {row.id && (
                          <button type="button" onClick={() => setDeleting(row)} aria-label={t("Delete {month} plan", { month: label })} title={t("Delete")} className={cn(LIST_ROW_ACTION, LIST_ROW_DELETE)}>
                            <Trash2 aria-hidden="true" />
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
      </Card>

      <BudgetDialog
        businessId={businessId}
        currency={currency}
        editing={editing}
        plans={plans}
        current={current}
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          setQuery("");
          if (same(shown, saved)) router.refresh();
          else goTo(saved);
        }}
      />
      <IEConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={deleting ? t("Delete the {month} plan?", { month: monthLabel(deleting.month, deleting.year, fmt) }) : ""}
        message={t("Only the targets are removed. Your transactions for that month stay as they are.")}
        confirmLabel={t("Delete")}
        onConfirm={remove}
        busy={isDeleting}
      />
    </PageFrame>
  );
}

// The four figures of the month shown (design: Budget's top strip).
function PlanFigures({
  plan,
  shown,
  current,
  today,
  money,
  signedMoney,
  busy,
}: {
  plan: MonthlyPlan;
  shown: YearMonth;
  current: YearMonth;
  today: string;
  money: (value: number) => string;
  signedMoney: (value: number) => string;
  busy: boolean;
}) {
  const { t, fmt } = useLocale();
  const target = Number(plan.incomeTarget ?? 0);
  const budget = Number(plan.expenseBudget ?? 0);
  const planned = target - budget;
  const saved = Number(plan.earned) - Number(plan.spent);
  const left = budget - Number(plan.spent);
  const days = daysLeft(shown.year, shown.month, today);
  const isCurrent = same(current, shown);
  const past = monthKey(shown) < monthKey(current);

  return (
    <Card padding="none" aria-busy={busy || undefined} className={cn("grid grid-cols-2 transition-opacity lg:grid-cols-4", busy && "opacity-60")}>
      <Figure index={0} label={t("Planned savings")} value={signedMoney(planned)} tone={planned < 0 ? "text-expense" : "text-ink"} sub={monthLabel(shown.month, shown.year, fmt)} />
      <Figure
        index={1}
        label={t("Saved so far")}
        value={signedMoney(saved)}
        tone={saved < 0 ? "text-expense" : "text-success"}
        sub={planned > 0 ? t("{percent}% of the plan", { percent: toLocaleDigits(String(Math.round((saved / planned) * 100)), fmt) }) : undefined}
      />
      <Figure
        index={2}
        label={t("Left to spend")}
        value={money(Math.abs(left))}
        tone={left < 0 ? "text-expense" : "text-ink"}
        sub={left < 0 ? t("Over budget") : t("Of {amount} budget", { amount: money(budget) })}
      />
      <Figure
        index={3}
        label={t("Days left this month")}
        value={isCurrent ? plural(t, days, "{count} day", "{count} days", undefined, fmt) : t(past ? "Month closed" : "Not started")}
        tone="text-ink"
        sub={
          <Link href={transactionsHref({ kind: "month", ...shown }, current)} className="font-semibold text-emerald hover:underline">
            {t("See transactions")}
          </Link>
        }
      />
    </Card>
  );
}

// Two by two on a phone and a tablet, four in a row from lg; the lines
// between them follow.
const FIGURE_LINES = ["", "border-l", "max-lg:border-t lg:border-l", "border-l max-lg:border-t"];

function Figure({ index, label, value, tone, sub }: { index: number; label: string; value: string; tone: string; sub?: React.ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 border-line px-4 py-3.5 md:px-6 md:py-4", FIGURE_LINES[index])}>
      <span className="text-small text-ink-muted">{label}</span>
      <span className={cn("text-[18px] font-bold tabular-nums md:text-[20px]", tone)}>{value}</span>
      {sub && <span className="text-[12.5px] text-ink-muted">{sub}</span>}
    </div>
  );
}
