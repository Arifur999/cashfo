"use client";

import { CalendarDays, MoreHorizontal, Pencil, Plus, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createElement, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import EmptyState from "@/components/smartly/EmptyState";
import Input from "@/components/smartly/form/Input";
import PageFrame from "@/components/smartly/PageFrame";
import ProgressBar from "@/components/smartly/ProgressBar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAmountField } from "@/hooks/useAmountField";
import type { BudgetCategorySummary, BudgetOverview } from "@/lib/customer/api";
import { deleteBudgetCategoryAction, updateBudgetTargetAction } from "@/lib/customer/budgetActions";
import { categoryIconFor } from "@/lib/customer/budgetCategoryVisuals";
import { budgetTone } from "@/lib/budgetTone";
import { categoryTone } from "@/lib/customer/categoryTone";
import { formatCurrency, currencySymbol } from "@/lib/customer/currency";
import { daysLeftInMonth } from "@/lib/customer/homeInsights";
import { categoryTransactionsHref } from "@/lib/customer/transactionRows";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BudgetPlanningHeader } from "./BudgetPlanningHeader";
import { type BudgetPath, budgetReference, outsideCategories } from "./budgetFigures";
import { CategoryDrawer } from "./CategoryDrawer";
import { monthLabel, monthOnlyLabel } from "./MonthSwitcher";

interface BudgetPageClientProps {
  businessId: string;
  // The address the page is on, kept when the month changes.
  path: BudgetPath;
  overview: BudgetOverview;
  // How many categories each tab has.
  counts: { expense: number; income: number };
  // Every expense of the month, categorised or not; null on an older
  // backend, when the categories' own sums stand in.
  monthTotal: number | null;
  currency: string;
  canManage: boolean;
  // Opened straight into Add category (from the New transaction drawer).
  openAdd: boolean;
  // "YYYY-MM-DD" today in the platform timezone, for "N days left".
  today: string;
}

// The design's budget colours (lib/budgetTone.ts) as text: under 70% green,
// 70–90% amber, over 90% red.
const TONE_TEXT = { income: "text-income", warning: "text-warning", expense: "text-expense-fill" } as const;

// One menu button for every card's actions: 32px, 44px to a finger.
const MENU_TRIGGER = "flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11";
const MENU_ITEM = "cursor-pointer rounded-md px-3 py-2 text-body text-ink focus:bg-surface-sunken";

// Budget planning, Expense categories (design-v4 Budget): the month's
// budget, what is spent and what is given to categories, then a card per
// expense category with its limit, its bar in the under-70 / 70–90 /
// over-90 colour, and what is left.
export function BudgetPageClient({ businessId, path, overview, counts, monthTotal, currency, canManage, openAdd, today }: BudgetPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  // Asked from a link (?addType=EXPENSE, the New transaction drawer's): Add
  // category opens, also when this page is already open, as a new query
  // keeps the page's state. Read off the address, not the server's prop
  // alone, which stays true once the ask is taken off below.
  const asked = openAdd && searchParams.get("addType") === "EXPENSE";
  const [drawer, setDrawer] = useState<"closed" | "create" | BudgetCategorySummary>(asked ? "create" : "closed");
  const [seenAsk, setSeenAsk] = useState(asked);
  if (asked !== seenAsk) {
    setSeenAsk(asked);
    if (asked) setDrawer("create");
  }
  const [targetOpen, setTargetOpen] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [switching, startSwitch] = useTransition();

  // The ask comes off the address once seen, so a refresh or the next month
  // doesn't open the drawer again, and the next link is a new ask.
  useEffect(() => {
    if (!asked) return;
    const next = new URLSearchParams(window.location.search);
    if (!next.has("addType")) return;
    next.delete("addType");
    const query = next.toString();
    window.history.replaceState(null, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
  }, [asked]);

  const month = overview.month;
  const year = overview.year;
  const total = overview.totalBudget ? Number(overview.totalBudget) : null;
  const allocated = Number(overview.allocated);
  const categorized = overview.categories.reduce((sum, c) => sum + Number(c.spent), 0);
  // The month's real spending; the categories' sums leave some out.
  const spent = monthTotal ?? categorized;
  const outside = outsideCategories(monthTotal, categorized);
  // What the month is measured against: the budget, or what the categories
  // were given when no budget is set.
  const reference = budgetReference(total, allocated);
  const usedPercent = reference ? Math.round((spent / reference.amount) * 100) : 0;
  const left = reference ? reference.amount - spent : 0;
  const unassigned = total !== null ? total - allocated : null;
  const isCurrentMonth = today.startsWith(`${year}-${String(month).padStart(2, "0")}`);
  const daysLeft = isCurrentMonth ? daysLeftInMonth(today) : 0;
  const money = (value: number) => formatCurrency(value, currency, locale);
  const percent = (value: number) => formatCount(Math.round(value), locale);
  const add = canManage ? () => setDrawer("create") : undefined;

  function goToMonth(nextMonth: number, nextYear: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("month", String(nextMonth));
    next.set("year", String(nextYear));
    next.delete("addType");
    startSwitch(() => router.push(`${path}?${next.toString()}`));
  }

  async function remove(category: BudgetCategorySummary) {
    if (!(await confirm({ title: t("Delete {name}?", { name: category.name }), message: t("Past transactions keep their category; only the limit goes."), confirmLabel: "Delete category" }))) return;
    startDelete(async () => {
      const result = await deleteBudgetCategoryAction(businessId, category.id);
      if (result.success) {
        toast.success(t("Category deleted"));
        router.refresh();
      } else {
        toast.error(t(result.message ?? "Failed to delete category"));
      }
    });
  }

  const statusOf = (category: BudgetCategorySummary) => {
    const remaining = Number(category.monthlyLimit ?? 0) - Number(category.spent);
    return remaining > 0 ? t("{amount} left", { amount: money(remaining) }) : remaining === 0 ? t("Limit reached") : t("Over by {amount}", { amount: money(-remaining) });
  };

  // A category's actions: all three for an owner or accountant; a viewer
  // still gets to its month's transactions.
  const menuItems = (category: BudgetCategorySummary) => (
    <DropdownMenuContent align="end" className="w-52 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
      {canManage && (
        <DropdownMenuItem onSelect={() => setDrawer(category)} className={MENU_ITEM}>
          {t("Edit")}
        </DropdownMenuItem>
      )}
      <DropdownMenuItem asChild className={MENU_ITEM}>
        <Link href={categoryTransactionsHref("EXPENSE", category.name, year, month)}>{t("See transactions")}</Link>
      </DropdownMenuItem>
      {canManage && (
        <DropdownMenuItem onSelect={() => remove(category)} disabled={deleting} className="cursor-pointer rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense">
          {t("Delete")}
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  );

  // What the month's figure is measured against, said when it isn't the budget.
  const notes = (outside > 0 || reference?.kind === "categories" || (!isCurrentMonth && reference)) && (
    <span className="flex flex-col gap-0.5">
      {outside > 0 && <span className="text-caption text-ink-muted">{t("{amount} spent outside these categories", { amount: money(outside) })}</span>}
      {reference?.kind === "categories" && <span className="text-caption text-ink-muted">{t("Measured against what the categories were given")}</span>}
      {!isCurrentMonth && reference && <span className="text-caption text-ink-muted">{t("Measured against today's budget and limits")}</span>}
    </span>
  );

  return (
    <PageFrame className="gap-5">
      <BudgetPlanningHeader tab="expense" path={path} month={month} year={year} counts={counts} onMonthChange={goToMonth} onAdd={add} />

      <div aria-busy={switching || undefined} className={cn("flex flex-col gap-5 transition-opacity", switching && "opacity-60")}>
        <Card padding="none" className="grid md:grid-cols-[0.8fr_1.3fr_1fr]">
          <div className="flex flex-col gap-1.5 px-5 py-5 md:px-6">
            <div className="flex items-center justify-between">
              <span className="text-small font-medium text-ink-muted">{t("Monthly budget")}</span>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setTargetOpen(true)}
                  aria-label={t("Edit monthly budget")}
                  title={t("Edit monthly budget")}
                  className="relative flex size-7.5 items-center justify-center rounded-full border border-line bg-surface text-ink-soft after:absolute after:-inset-2 hover:bg-surface-sunken"
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
            {total !== null ? <span className="text-amount-lg text-ink tabular-nums">{money(total)}</span> : <span className="text-h3 text-ink-muted">{t("Not set")}</span>}
            {/* The API keeps one budget for every month; this is the one on show. */}
            <span className="text-caption text-ink-muted">{t("For {month}", { month: monthLabel(month, year, locale) })}</span>
          </div>
          <div className="flex flex-col gap-2.5 border-t border-line px-5 py-5 md:border-t-0 md:border-l md:px-6">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-small font-medium text-ink-muted">{t("Spent so far")}</span>
              {reference && <span className={cn("text-small font-semibold", TONE_TEXT[budgetTone(usedPercent)])}>{t("{percent}% used", { percent: percent(usedPercent) })}</span>}
            </div>
            {/* The hero first in either language; "of the limit" trails it. */}
            <span className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-h2 tracking-normal text-ink tabular-nums">{money(spent)}</span>
              {reference && <span className="text-body font-medium text-ink-muted tabular-nums">{t("of {amount}", { amount: money(reference.amount) })}</span>}
            </span>
            <ProgressBar value={reference ? usedPercent : 0} tone="budget" label={t("Spent so far")} valueText={reference ? t("{percent}% used", { percent: percent(usedPercent) }) : undefined} className="h-2.5" />
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-caption text-ink-muted">
              <span>
                {reference
                  ? left >= 0
                    ? fillNodes(t("{amount} left"), { amount: <b className="font-semibold text-ink">{money(left)}</b> })
                    : fillNodes(t("Over by {amount}"), { amount: <b className="font-semibold text-expense">{money(-left)}</b> })
                  : t("Set a monthly budget to see what is still free")}
              </span>
              {isCurrentMonth && (
                <span className="flex items-center gap-1.25">
                  <CalendarDays className="size-3.25" aria-hidden="true" />
                  {t(daysLeft === 1 ? "{count} day left in {month}" : "{count} days left in {month}", { count: formatCount(daysLeft, locale), month: monthOnlyLabel(month, locale) })}
                </span>
              )}
            </div>
            {notes}
          </div>
          <div className="flex flex-col gap-2.5 border-t border-line px-5 py-5 md:border-t-0 md:border-l md:px-6">
            <span className="text-small font-medium text-ink-muted">{t("Given to categories")}</span>
            <span className="text-h2 tracking-normal text-ink tabular-nums">{money(allocated)}</span>
            <span className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
              <span className="bg-emerald" style={{ width: `${total ? Math.min(100, (allocated / total) * 100) : 0}%` }} />
              <span className="flex-1 bg-line" />
            </span>
            <span className="text-caption text-ink-muted">
              {unassigned === null
                ? t("Set a monthly budget to see what is still free")
                : unassigned >= 0
                  ? fillNodes(t("{amount} not given to any category yet"), { amount: <b className="font-semibold text-ink">{money(unassigned)}</b> })
                  : fillNodes(t("{amount} more than the budget is given out"), { amount: <b className="font-semibold text-expense">{money(-unassigned)}</b> })}
            </span>
          </div>
        </Card>

        {overview.categories.length === 0 && !canManage ? (
          <EmptyState icon={<Plus />} title={t("No expense categories yet")} description={t("Groceries, rent, transport, bills…")} />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <h2 className="text-title text-ink">{t("Categories")}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-soft">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-[3px] bg-income" /> {t("Under {percent}%", { percent: formatCount(70, locale) })}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-[3px] bg-warning-fill" /> {t("{from}–{to}%", { from: formatCount(70, locale), to: formatCount(90, locale) })}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-[3px] bg-expense-fill" /> {t("Over {percent}%", { percent: formatCount(90, locale) })}
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {overview.categories.map((category) => {
                const limit = Number(category.monthlyLimit ?? 0);
                const used = Number(category.spent);
                const tone = budgetTone(category.percent);
                const visual = categoryTone(category.color);
                return (
                  <div key={category.id} className={cn("flex flex-col gap-3 rounded-md border bg-surface p-4.5 shadow-control", tone === "expense" ? "border-expense-line" : "border-line")}>
                    <div className="flex items-center gap-3">
                      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-4.75", visual.bg, visual.fg)}>{createElement(categoryIconFor(category), { "aria-hidden": true })}</span>
                      <span className="flex min-w-0 flex-1 flex-col gap-px">
                        <span className="truncate text-[15px] font-semibold text-ink">{category.name}</span>
                        <span className="text-caption text-ink-muted tabular-nums">{t("Limit {amount}", { amount: money(limit) })}</span>
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger aria-label={t("{name}: actions", { name: category.name })} className={MENU_TRIGGER}>
                          <MoreHorizontal className="size-4.5" aria-hidden="true" />
                        </DropdownMenuTrigger>
                        {menuItems(category)}
                      </DropdownMenu>
                    </div>
                    <span className="text-small font-medium text-ink-muted tabular-nums">
                      {fillNodes(t("{amount} spent"), { amount: <span className="text-[20px] font-bold tracking-[-0.01em] text-ink">{money(used)}</span> })}
                    </span>
                    <ProgressBar value={category.percent} tone="budget" label={category.name} valueText={t("{percent}% used", { percent: percent(category.percent) })} />
                    <div className={cn("flex items-center justify-between gap-3 text-small font-semibold", TONE_TEXT[tone])}>
                      <span className="flex items-center gap-1.5">
                        {tone === "expense" && <TriangleAlert className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />}
                        {statusOf(category)}
                      </span>
                      <span className="tabular-nums">{toPercentText(percent(category.percent))}</span>
                    </div>
                  </div>
                );
              })}
              {canManage && (
                <button type="button" onClick={() => setDrawer("create")} className="flex min-h-41.5 flex-col items-center justify-center gap-2 rounded-md border-[1.5px] border-dashed border-input bg-surface p-5 text-center transition-colors hover:border-emerald dark:border-line-strong">
                  <span className="flex size-10 items-center justify-center rounded-[10px] bg-emerald-soft text-emerald">
                    <Plus className="size-4.5" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  <span className="text-body font-semibold text-ink">{t("Add expense category")}</span>
                  <span className="text-caption text-ink-muted">
                    {unassigned !== null && unassigned > 0 ? t("{amount} of your budget isn't assigned yet", { amount: money(unassigned) }) : t("Groceries, rent, transport, bills…")}
                  </span>
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <CategoryDrawer
        open={drawer !== "closed"}
        onClose={() => setDrawer("closed")}
        businessId={businessId}
        type="EXPENSE"
        editing={drawer === "closed" || drawer === "create" ? null : drawer}
        currency={currency}
        unassigned={unassigned}
        totalBudget={total}
        existingNames={overview.categories.map((c) => c.name)}
      />
      <MonthlyBudgetDialog open={targetOpen} onClose={() => setTargetOpen(false)} businessId={businessId} current={total} currency={currency} />
      {confirmDialog}
    </PageFrame>
  );
}


// "45%" in the reader's digits ("৪৫%").
const toPercentText = (digits: string) => `${digits}%`;

function MonthlyBudgetDialog({ open, onClose, businessId, current, currency }: { open: boolean; onClose: () => void; businessId: string; current: number | null; currency: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const [value, setValue] = useState(current ? String(current) : "");
  const valueField = useAmountField(value, setValue, currency);
  const [isPending, startTransition] = useTransition();
  // Remove asks first, in the dialog itself, not a second one on top.
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setValue(current ? String(current) : "");
      setConfirmingRemove(false);
    }
  }
  const amount = Number(value) || 0;

  function save(target: number | null) {
    startTransition(async () => {
      const result = await updateBudgetTargetAction(businessId, target);
      if (result.success) {
        toast.success(t(target === null ? "Monthly budget removed" : "Monthly budget updated"));
        onClose();
        router.refresh();
      } else {
        toast.error(t(result.message ?? "Failed to update total budget"));
      }
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!(amount > 0) || isPending) return;
    save(amount);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <DialogContent showCloseButton={false} className="w-110 max-w-[calc(100vw-32px)] gap-0 rounded-lg border border-line bg-surface p-6 shadow-overlay">
        {confirmingRemove ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-h3 text-ink">{t("Remove the monthly budget?")}</DialogTitle>
              <DialogDescription className="text-body text-ink-2">{t("No month will have a budget, past ones too. Your category limits stay, and the month is measured against what they were given.")}</DialogDescription>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setConfirmingRemove(false)} disabled={isPending} autoFocus>
                {t("Cancel")}
              </Button>
              <Button type="button" variant="danger" onClick={() => !isPending && save(null)} disabled={isPending}>
                {isPending && <Loader size={16} onDark label={t("Loading...")} />}
                {t("Remove budget")}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-h3 text-ink">{t("Monthly budget")}</DialogTitle>
              {/* The API keeps one target for every month, past ones too. */}
              <DialogDescription className="text-body text-ink-2">{t("How much you plan to spend in a month. It applies to every month, past ones too, and your categories share it.")}</DialogDescription>
            </div>
            <Input id="budget-target" type="text" inputMode="decimal" size="lg" {...valueField} leading={<span className="text-body font-semibold">{currencySymbol(currency)}</span>} autoFocus aria-label={t("Monthly budget")} className="text-h3 font-semibold tabular-nums" />
            <div className="flex flex-wrap items-center gap-3">
              {current !== null && (
                <Button type="button" variant="ghost" onClick={() => setConfirmingRemove(true)} disabled={isPending} className="-ml-2 text-expense hover:bg-expense-soft hover:text-expense">
                  {t("Remove budget")}
                </Button>
              )}
              <span className="flex-1" />
              <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={!(amount > 0) || isPending}>
                {isPending && <Loader size={16} onDark label={t("Loading...")} />}
                {t("Save")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
