"use client";

import { CalendarDays, Info, MoreHorizontal, Pencil, Plus, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createElement, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import Loader from "@/components/shared/Loader";
import AmountText from "@/components/smartly/AmountText";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import EmptyState from "@/components/smartly/EmptyState";
import Input from "@/components/smartly/form/Input";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
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
import { budgetReference, outsideCategories } from "./budgetFigures";
import { CategoryDrawer } from "./CategoryDrawer";
import { MonthSwitcher, monthOnlyLabel } from "./MonthSwitcher";
import { useRowMenus } from "./useRowMenus";

interface BudgetPageClientProps {
  businessId: string;
  overview: BudgetOverview;
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

const TONE_TEXT = { income: "text-income", warning: "text-warning", expense: "text-expense" } as const;

// One menu button for every row's actions, the size of the others.
const MENU_TRIGGER = "flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11";
const MENU_ITEM = "cursor-pointer rounded-md px-3 py-2 text-body text-ink focus:bg-surface-sunken";

// Budget: the month's total, what is spent and what is given to
// categories, then a card per expense category with its limit, its bar in
// the under-70 / 70–90 / over-90 colour, and what is left.
export function BudgetPageClient({ businessId, overview, monthTotal, currency, canManage, openAdd, today }: BudgetPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const rowMenu = useRowMenus();
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
    window.history.replaceState(null, "", query ? `/categories?${query}` : "/categories");
  }, [asked]);

  const month = overview.month;
  const year = overview.year;
  const total = overview.totalBudget ? Number(overview.totalBudget) : null;
  const allocated = Number(overview.allocated);
  const categorized = overview.categories.reduce((sum, c) => sum + Number(c.spent), 0);
  // The month's real spending; the categories' sums leave some out.
  const spent = monthTotal ?? categorized;
  const outside = outsideCategories(monthTotal, categorized);
  // Phone and desktop measure against the same thing: the budget, or
  // what the categories were given when no budget is set.
  const reference = budgetReference(total, allocated);
  const usedPercent = reference ? Math.round((spent / reference.amount) * 100) : 0;
  const left = reference ? reference.amount - spent : 0;
  const unassigned = total !== null ? total - allocated : null;
  const isCurrentMonth = today.startsWith(`${year}-${String(month).padStart(2, "0")}`);
  const daysLeft = isCurrentMonth ? daysLeftInMonth(today) : 0;
  const money = (value: number) => formatCurrency(value, currency);
  const percent = (value: number) => formatCount(Math.round(value), locale);

  function goToMonth(nextMonth: number, nextYear: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("month", String(nextMonth));
    next.set("year", String(nextYear));
    next.delete("addType");
    startSwitch(() => router.push(`/categories?${next.toString()}`));
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
  const notes = (
    <>
      {outside > 0 && <span className="block text-caption text-ink-muted">{t("{amount} spent outside these categories", { amount: money(outside) })}</span>}
      {reference?.kind === "categories" && <span className="block text-caption text-ink-muted">{t("Measured against what the categories were given")}</span>}
      {!isCurrentMonth && reference && <span className="block text-caption text-ink-muted">{t("Measured against today's budget and limits")}</span>}
    </>
  );

  const empty = overview.categories.length === 0 && (
    <EmptyState
      icon={<Plus />}
      title={t("No expense categories yet")}
      description={t("Groceries, rent, transport, bills…")}
      action={
        canManage && (
          <Button onClick={() => setDrawer("create")}>
            <Plus strokeWidth={2.5} className="size-4" />
            {t("Add expense category")}
          </Button>
        )
      }
    />
  );

  return (
    <PageFrame>
      <PageHeader
        eyebrow={t("Money")}
        title={t("Budget")}
        description={
          <>
            <span className="md:hidden">{t("Monthly limits for what you spend.")}</span>
            <span className="hidden md:inline">{t("Set a monthly limit for each kind of spending.")}</span>
          </>
        }
        actions={
          <>
            <MonthSwitcher month={month} year={year} onChange={goToMonth} />
            {canManage && (
              <Button onClick={() => setDrawer("create")}>
                <Plus strokeWidth={2.5} className="size-4" />
                {t("Add expense category")}
              </Button>
            )}
          </>
        }
        hideActionsOnPhone
      />

      <div aria-busy={switching || undefined} className={cn("flex flex-col gap-4 transition-opacity", switching && "opacity-60")}>
        {/* Phone: the month, then one card for the month's spending. */}
        <div className="flex flex-col gap-4 md:hidden">
          <MonthSwitcher month={month} year={year} onChange={goToMonth} stretch />
          <Card padding="sm" elevated={false} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between text-small text-ink-muted">
              <span>{t("Spent")}</span>
              <span className="flex items-center gap-2">
                {reference && t("of {amount}", { amount: money(reference.amount) })}
                {canManage && (
                  // 24px to look at, 44px to tap.
                  <button
                    type="button"
                    onClick={() => setTargetOpen(true)}
                    aria-label={t("Edit monthly budget")}
                    className="relative flex size-6 items-center justify-center rounded-md border border-line bg-surface text-ink-2 after:absolute after:-inset-2.5"
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </button>
                )}
              </span>
            </div>
            <AmountText value={spent} currency={currency} size="h2" className="text-h1 font-extrabold" />
            <ProgressBar value={usedPercent} tone="budget" label={t("{name}, {percent}% used", { name: t("Spent so far"), percent: percent(usedPercent) })} className="h-2.5" />
            <span className={cn("text-small font-semibold", reference ? TONE_TEXT[budgetTone(usedPercent)] : "text-ink-muted")}>
              {!reference
                ? t("Set a monthly budget to see what is still free")
                : left < 0
                  ? t("{percent}% used · over by {amount}", { percent: percent(usedPercent), amount: money(-left) })
                  : isCurrentMonth
                    ? t(daysLeft === 1 ? "{percent}% used · {left} left for {count} day" : "{percent}% used · {left} left for {count} days", { percent: percent(usedPercent), left: money(left), count: formatCount(daysLeft, locale) })
                    : t("{percent}% used · {left} left", { percent: percent(usedPercent), left: money(left) })}
            </span>
            {notes}
          </Card>
        </div>

        <p className="flex items-center gap-2 text-small text-ink-muted md:gap-3 md:text-body">
          <Info className="size-4 shrink-0" aria-hidden="true" />
          <span>
            {fillNodes(t("Budget is for spending limits. Money coming in lives in {link}."), {
              link: (
                <Link href="/income-category" className="font-semibold text-emerald hover:underline">
                  {t("Income sources")}
                </Link>
              ),
            })}
          </span>
        </p>

        <Card padding="none" className="hidden md:grid md:grid-cols-[0.8fr_1.3fr_1fr]">
          <div className="flex flex-col gap-2 px-5 py-5 md:px-6">
            <div className="flex items-center justify-between">
              <span className="text-small font-medium text-ink-muted">{t("Monthly budget")}</span>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setTargetOpen(true)}
                  aria-label={t("Edit monthly budget")}
                  title={t("Edit monthly budget")}
                  className="relative flex size-7.5 items-center justify-center rounded-md border border-line bg-surface text-ink-2 after:absolute after:-inset-2 hover:bg-surface-sunken"
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
            {total !== null ? <AmountText value={total} currency={currency} size="lg" /> : <span className="text-h3 text-ink-muted">{t("Not set")}</span>}
            {/* One budget for every month: the API keeps a single target. */}
            <span className="text-caption font-normal text-ink-muted">{t("Same every month")}</span>
          </div>
          <div className="flex flex-col gap-3 border-t border-line px-5 py-5 md:border-t-0 md:border-l md:px-6">
            <div className="flex items-baseline justify-between">
              <span className="text-small font-medium text-ink-muted">{t("Spent so far")}</span>
              {reference && <span className={cn("text-small font-semibold", TONE_TEXT[budgetTone(usedPercent)])}>{t("{percent}% used", { percent: percent(usedPercent) })}</span>}
            </div>
            <span className="text-body font-medium text-ink-muted tabular-nums">
              {reference
                ? fillNodes(t("{used} of {limit}"), { used: <span className="text-h2 text-ink">{money(spent)}</span>, limit: money(reference.amount) })
                : <span className="text-h2 text-ink">{money(spent)}</span>}
            </span>
            <ProgressBar value={reference ? usedPercent : 0} tone="budget" label={t("{name}, {percent}% used", { name: t("Spent so far"), percent: percent(usedPercent) })} className="h-2.5" />
            <div className="flex justify-between gap-3 text-caption font-normal text-ink-muted">
              <span>
                {reference &&
                  (left >= 0
                    ? fillNodes(t("{amount} left"), { amount: <b className="font-semibold text-ink">{money(left)}</b> })
                    : fillNodes(t("Over by {amount}"), { amount: <b className="font-semibold text-expense">{money(-left)}</b> }))}
              </span>
              {isCurrentMonth && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3.25" aria-hidden="true" />
                  {t(daysLeft === 1 ? "{count} day left in {month}" : "{count} days left in {month}", { count: formatCount(daysLeft, locale), month: monthOnlyLabel(month, locale) })}
                </span>
              )}
            </div>
            {notes}
          </div>
          <div className="flex flex-col gap-3 border-t border-line px-5 py-5 md:border-t-0 md:border-l md:px-6">
            <span className="text-small font-medium text-ink-muted">{t("Given to categories")}</span>
            <AmountText value={allocated} currency={currency} size="h2" />
            <span className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
              <span className="rounded-full bg-emerald" style={{ width: `${total ? Math.min(100, (allocated / total) * 100) : 0}%` }} />
              <span className="flex-1 rounded-full bg-surface-sunken" />
            </span>
            <span className="text-caption font-normal text-ink-muted">
              {unassigned === null
                ? t("Set a monthly budget to see what is still free")
                : unassigned >= 0
                  ? fillNodes(t("{amount} not given to any category yet"), { amount: <b className="font-semibold text-ink">{money(unassigned)}</b> })
                  : fillNodes(t("{amount} more than the budget is given out"), { amount: <b className="font-semibold text-expense">{money(-unassigned)}</b> })}
            </span>
          </div>
        </Card>

        {empty}

        {/* Phone: one card of rows; a row opens its actions. */}
        {overview.categories.length > 0 && (
          <Card padding="none" elevated={false} className="overflow-hidden md:hidden">
            {overview.categories.map((category, index) => {
              const limit = Number(category.monthlyLimit ?? 0);
              const used = Number(category.spent);
              const tone = budgetTone(category.percent);
              const visual = categoryTone(category.color);
              const row = (
                <>
                  <span className="flex items-center gap-3">
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md [&_svg]:size-4.25", visual.bg, visual.fg)}>{createElement(categoryIconFor(category), { "aria-hidden": true })}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <b className="truncate text-body-lg font-semibold text-ink">{category.name}</b>
                      <span className="text-caption font-normal text-ink-muted tabular-nums">{t("{used} of {limit}", { used: money(used), limit: money(limit) })}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end">
                      <b className={cn("text-body font-bold tabular-nums", TONE_TEXT[tone])}>{toPercentText(percent(category.percent))}</b>
                      <span className="text-caption font-normal text-ink-muted">{statusOf(category)}</span>
                    </span>
                  </span>
                  <ProgressBar value={category.percent} tone="budget" size="sm" label={t("{name}, {percent}% used", { name: category.name, percent: percent(category.percent) })} />
                </>
              );
              const rowClass = cn("flex w-full flex-col gap-2 px-4 py-4 text-left", index > 0 && "border-t border-divider");
              const phoneMenu = rowMenu(category.id);
              // A tap on the row opens its menu; a finger scrolling the page doesn't.
              return canManage ? (
                <DropdownMenu key={category.id} {...phoneMenu.root}>
                  <DropdownMenuTrigger aria-label={t("{name}: actions", { name: category.name })} className={cn(rowClass, "data-open:bg-hover")} {...phoneMenu.trigger}>
                    {row}
                  </DropdownMenuTrigger>
                  {menuItems(category)}
                </DropdownMenu>
              ) : (
                <Link key={category.id} href={categoryTransactionsHref("EXPENSE", category.name, year, month)} className={cn(rowClass, "hover:bg-hover")}>
                  {row}
                </Link>
              );
            })}
          </Card>
        )}
        {canManage && overview.categories.length > 0 && (
          <Button variant="soft" size="xl" onClick={() => setDrawer("create")} className="md:hidden">
            <Plus strokeWidth={2.25} className="size-4" />
            {t("Add expense category")}
          </Button>
        )}

        {overview.categories.length > 0 && (
          <>
            <div className="hidden flex-wrap items-center justify-between gap-3 md:flex">
              <h2 className="text-title text-ink">{t("Categories")}</h2>
              <div className="flex gap-4 text-caption text-ink-2">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-[3px] bg-income" /> {t("Under {percent}%", { percent: formatCount(70, locale) })}
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-[3px] bg-warning-fill" /> {t("{from}–{to}%", { from: formatCount(70, locale), to: formatCount(90, locale) })}
                </span>
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-[3px] bg-expense-fill" /> {t("Over {percent}%", { percent: formatCount(90, locale) })}
                </span>
              </div>
            </div>

            <div className="hidden gap-4 sm:grid-cols-2 md:grid lg:grid-cols-3">
              {overview.categories.map((category) => {
                const limit = Number(category.monthlyLimit ?? 0);
                const used = Number(category.spent);
                const tone = budgetTone(category.percent);
                const visual = categoryTone(category.color);
                return (
                  <Card key={category.id} className={cn("flex flex-col gap-3", tone === "expense" && "border-expense-line")}>
                    <div className="flex items-center gap-3">
                      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md [&_svg]:size-4.75", visual.bg, visual.fg)}>{createElement(categoryIconFor(category), { "aria-hidden": true })}</span>
                      <span className="flex min-w-0 flex-1 flex-col gap-px">
                        <span className="truncate text-title text-ink">{category.name}</span>
                        <span className="text-caption font-normal text-ink-muted tabular-nums">{t("Limit {amount}", { amount: money(limit) })}</span>
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger aria-label={t("{name}: actions", { name: category.name })} className={MENU_TRIGGER}>
                          <MoreHorizontal className="size-4.5" aria-hidden="true" />
                        </DropdownMenuTrigger>
                        {menuItems(category)}
                      </DropdownMenu>
                    </div>
                    <span className="text-small font-medium text-ink-muted tabular-nums">{fillNodes(t("{amount} spent"), { amount: <span className="text-h2 text-ink">{money(used)}</span> })}</span>
                    <ProgressBar value={category.percent} tone="budget" label={t("{name}, {percent}% used", { name: category.name, percent: percent(category.percent) })} />
                    <div className={cn("flex items-center justify-between text-small font-semibold", TONE_TEXT[tone])}>
                      <span className="flex items-center gap-2">
                        {tone === "expense" && <TriangleAlert className="size-3.5" strokeWidth={2.25} aria-hidden="true" />}
                        {statusOf(category)}
                      </span>
                      <span className="tabular-nums">{toPercentText(percent(category.percent))}</span>
                    </div>
                  </Card>
                );
              })}
              {canManage && (
                <button type="button" onClick={() => setDrawer("create")} className="flex min-h-41.5 flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-line-strong bg-surface p-5 text-center transition-colors hover:border-emerald">
                  <span className="flex size-10 items-center justify-center rounded-full bg-mint-50 text-emerald">
                    <Plus className="size-4.5" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  <span className="text-body font-semibold text-ink">{t("Add expense category")}</span>
                  <span className="text-caption font-normal text-ink-muted">
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
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setValue(current ? String(current) : "");
  }
  const amount = Number(value) || 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!(amount > 0) || isPending) return;
    startTransition(async () => {
      const result = await updateBudgetTargetAction(businessId, amount);
      if (result.success) {
        toast.success(t("Monthly budget updated"));
        onClose();
        router.refresh();
      } else {
        toast.error(t(result.message ?? "Failed to update total budget"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <DialogContent showCloseButton={false} className="w-110 max-w-[calc(100vw-32px)] gap-0 rounded-lg border border-line bg-surface p-6 shadow-overlay">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-h3 text-ink">{t("Monthly budget")}</DialogTitle>
            {/* The API keeps one target for every month, past ones too. */}
            <DialogDescription className="text-body text-ink-2">{t("How much you plan to spend in a month. It applies to every month, past ones too, and your categories share it.")}</DialogDescription>
          </div>
          <Input id="budget-target" type="text" inputMode="decimal" size="lg" {...valueField} leading={<span className="text-body font-semibold">{currencySymbol(currency)}</span>} autoFocus aria-label={t("Monthly budget")} className="text-h3 font-semibold tabular-nums" />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!(amount > 0) || isPending}>
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {t("Save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
