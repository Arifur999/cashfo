"use client";

import { CalendarDays, Info, MoreHorizontal, Pencil, Plus, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import Loader from "@/components/shared/Loader";
import AmountText from "@/components/smartly/AmountText";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Input from "@/components/smartly/form/Input";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import ProgressBar from "@/components/smartly/ProgressBar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { BudgetCategorySummary, BudgetOverview } from "@/lib/customer/api";
import { deleteBudgetCategoryAction, updateBudgetTargetAction } from "@/lib/customer/budgetActions";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { budgetTone } from "@/lib/budgetTone";
import { categoryTone } from "@/lib/customer/categoryTone";
import { formatCurrency, currencySymbol } from "@/lib/customer/currency";
import { daysLeftInMonth } from "@/lib/customer/homeInsights";
import { normalizeMoneyInput } from "@/lib/customer/money";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CategoryDrawer } from "./CategoryDrawer";
import { MonthSwitcher, monthLabel } from "./MonthSwitcher";

interface BudgetPageClientProps {
  businessId: string;
  overview: BudgetOverview;
  currency: string;
  canManage: boolean;
  // Opened straight into Add category (from the New transaction drawer).
  openAdd: boolean;
  // "YYYY-MM-DD" today in the platform timezone, for "N days left".
  today: string;
}

const TONE_TEXT = { income: "text-income", warning: "text-warning", expense: "text-expense" } as const;

// Budget: the month's total, what is spent and what is given to
// categories, then a card per expense category with its limit, its bar in
// the under-70 / 70–90 / over-90 colour, and what is left.
export function BudgetPageClient({ businessId, overview, currency, canManage, openAdd, today }: BudgetPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [drawer, setDrawer] = useState<"closed" | "create" | BudgetCategorySummary>(openAdd ? "create" : "closed");
  const [targetOpen, setTargetOpen] = useState(false);
  const [deleting, startDelete] = useTransition();

  const month = overview.month;
  const year = overview.year;
  const total = overview.totalBudget ? Number(overview.totalBudget) : null;
  const allocated = Number(overview.allocated);
  const spent = overview.categories.reduce((sum, c) => sum + Number(c.spent), 0);
  const spentPercent = total ? Math.round((spent / total) * 100) : 0;
  const unassigned = total !== null ? total - allocated : null;
  const isCurrentMonth = today.startsWith(`${year}-${String(month).padStart(2, "0")}`);
  const daysLeft = isCurrentMonth ? daysLeftInMonth(today) : 0;
  const monthName = monthLabel(month, year, locale);
  // The phone's one summary measures against the budget, or against what
  // the categories were given when no budget is set.
  const reference = total ?? allocated;
  const referencePercent = reference > 0 ? Math.round((spent / reference) * 100) : 0;

  function goToMonth(nextMonth: number, nextYear: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("month", String(nextMonth));
    next.set("year", String(nextYear));
    router.push(`/categories?${next.toString()}`);
  }

  async function remove(category: BudgetCategorySummary) {
    if (!(await confirm({ title: `${t("Delete")} ${category.name}?`, message: t("Past transactions keep their category; only the limit goes."), confirmLabel: "Delete category" }))) return;
    startDelete(async () => {
      const result = await deleteBudgetCategoryAction(businessId, category.id);
      if (result.success) {
        toast.success(t("Category deleted"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to delete category"));
      }
    });
  }

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={t("Money")}
        title={t("Budget")}
        description={t("Set a monthly limit for each kind of spending.")}
        actions={
          <div className="hidden items-center gap-3 md:flex">
            <MonthSwitcher month={month} year={year} onChange={goToMonth} />
            {canManage && (
              <Button onClick={() => setDrawer("create")}>
                <Plus strokeWidth={2.5} className="size-4" />
                {t("Add expense category")}
              </Button>
            )}
          </div>
        }
      />

      {/* Phone: the month, then one card for the month's spending. */}
      <div className="flex flex-col gap-4 md:hidden">
        <MonthSwitcher month={month} year={year} onChange={goToMonth} stretch />
        <Card padding="sm" className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between text-small text-ink-muted">
            <span>{t("Spent")}</span>
            <span className="flex items-center gap-2">
              {reference > 0 && `${t("of")} ${formatCurrency(reference, currency)}`}
              {canManage && (
                <button type="button" onClick={() => setTargetOpen(true)} aria-label={t("Edit monthly budget")} className="flex size-7 items-center justify-center rounded-md border border-line bg-surface text-ink-2">
                  <Pencil className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </span>
          </div>
          <AmountText value={spent} currency={currency} size="h2" className="text-h1" />
          <ProgressBar value={referencePercent} tone="budget" label={t("Spent so far")} className="h-2.5" />
          <span className={cn("text-small font-semibold", reference > 0 ? TONE_TEXT[budgetTone(referencePercent)] : "text-ink-muted")}>
            {reference > 0 ? `${referencePercent}% ${t("used")} · ${formatCurrency(reference - spent, currency)} ${t("left")}` : t("Set a monthly budget to see what is still free")}
            {reference > 0 && isCurrentMonth && ` ${t("for")} ${daysLeft} ${t(daysLeft === 1 ? "day" : "days")}`}
          </span>
        </Card>
      </div>

      <p className="hidden items-center gap-3 text-body text-ink-muted md:flex">
        <Info className="size-4 shrink-0" aria-hidden="true" />
        <span>
          {t("Budget is for spending limits. Money coming in lives in")}{" "}
          <Link href="/income-category" className="font-semibold text-emerald hover:underline">
            {t("Income sources")}
          </Link>
          .
        </span>
      </p>

      <Card padding="none" className="hidden md:grid md:grid-cols-[0.8fr_1.3fr_1fr]">
        <div className="flex flex-col gap-2 px-5 py-5 md:px-6">
          <div className="flex items-center justify-between">
            <span className="text-small font-medium text-ink-muted">{t("Monthly budget")}</span>
            {canManage && (
              <button type="button" onClick={() => setTargetOpen(true)} aria-label={t("Edit monthly budget")} title={t("Edit monthly budget")} className="flex size-7.5 items-center justify-center rounded-md border border-line bg-surface text-ink-2 hover:bg-cream">
                <Pencil className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          {total !== null ? <AmountText value={total} currency={currency} size="lg" /> : <span className="text-h3 text-ink-muted">{t("Not set")}</span>}
          <span className="text-caption font-normal text-ink-muted">
            {t("For")} {monthName}
          </span>
        </div>
        <div className="flex flex-col gap-3 border-t border-line px-5 py-5 md:border-t-0 md:border-l md:px-6">
          <div className="flex items-baseline justify-between">
            <span className="text-small font-medium text-ink-muted">{t("Spent so far")}</span>
            {total !== null && <span className={cn("text-small font-semibold", TONE_TEXT[budgetTone(spentPercent)])}>{spentPercent}% {t("used")}</span>}
          </div>
          <span className="text-h2 text-ink tabular-nums">
            {formatCurrency(spent, currency)}
            {total !== null && (
              <span className="text-body font-medium text-ink-muted">
                {" "}
                {t("of")} {formatCurrency(total, currency)}
              </span>
            )}
          </span>
          <ProgressBar value={total !== null ? spentPercent : 0} tone="budget" label={t("Spent so far")} className="h-2.5" />
          <div className="flex justify-between text-caption font-normal text-ink-muted">
            <span>
              {total !== null && (
                <>
                  <b className="font-semibold text-ink">{formatCurrency(total - spent, currency)}</b> {t("left")}
                </>
              )}
            </span>
            {isCurrentMonth && (
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3.25" aria-hidden="true" />
                {daysLeft} {t("days left in")} {monthName.split(" ")[0]}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-line px-5 py-5 md:border-t-0 md:border-l md:px-6">
          <span className="text-small font-medium text-ink-muted">{t("Given to categories")}</span>
          <AmountText value={allocated} currency={currency} size="h2" />
          <span className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
            <span className="rounded-full bg-emerald" style={{ width: `${total ? Math.min(100, (allocated / total) * 100) : 0}%` }} />
            <span className="flex-1 rounded-full bg-surface-sunken" />
          </span>
          <span className="text-caption font-normal text-ink-muted">
            {unassigned === null ? (
              t("Set a monthly budget to see what is still free")
            ) : unassigned >= 0 ? (
              <>
                <b className="font-semibold text-ink">{formatCurrency(unassigned, currency)}</b> {t("not given to any category yet")}
              </>
            ) : (
              <>
                <b className="font-semibold text-expense">{formatCurrency(-unassigned, currency)}</b> {t("more than the budget is given out")}
              </>
            )}
          </span>
        </div>
      </Card>

      {/* Phone: one card of rows; a row opens its actions. */}
      <Card padding="none" className="overflow-hidden md:hidden">
        {overview.categories.length === 0 && <p className="px-4 py-8 text-center text-body text-ink-muted">{t("No expense categories yet.")}</p>}
        {overview.categories.map((category, index) => {
          const limit = Number(category.monthlyLimit ?? 0);
          const used = Number(category.spent);
          const left = limit - used;
          const tone = budgetTone(category.percent);
          const visual = categoryTone(category.color);
          const status = left > 0 ? `${formatCurrency(left, currency)} ${t("left")}` : left === 0 ? t("Limit reached") : `${t("Over by")} ${formatCurrency(-left, currency)}`;
          const row = (
            <>
              <span className="flex items-center gap-3">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md [&_svg]:size-4.25", visual.bg, visual.fg)}>{category.icon && createElement(budgetCategoryIcon(category.icon), { "aria-hidden": true })}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="truncate text-body-lg font-semibold text-ink">{category.name}</b>
                  <span className="text-caption text-ink-muted tabular-nums">
                    {formatCurrency(used, currency)} {t("of")} {formatCurrency(limit, currency)}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <b className={cn("text-body font-bold tabular-nums", TONE_TEXT[tone])}>{Math.round(category.percent)}%</b>
                  <span className="text-caption text-ink-muted">{status}</span>
                </span>
              </span>
              <ProgressBar value={category.percent} tone="budget" size="sm" label={category.name} />
            </>
          );
          const rowClass = cn("flex w-full flex-col gap-2 px-4 py-4 text-left", index > 0 && "border-t border-surface-sunken");
          return canManage ? (
            <DropdownMenu key={category.id}>
              <DropdownMenuTrigger aria-label={`${category.name}: ${t("actions")}`} className={cn(rowClass, "data-open:bg-cream/60")}>
                {row}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
                <DropdownMenuItem onSelect={() => setDrawer(category)} className="cursor-pointer rounded-md px-3 py-2 text-body text-ink focus:bg-cream">
                  {t("Edit")}
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer rounded-md px-3 py-2 text-body text-ink focus:bg-cream">
                  <Link href={`/transactions?type=EXPENSE&categoryId=${encodeURIComponent(category.name)}&dateFrom=${year}-${String(month).padStart(2, "0")}-01&dateTo=${year}-${String(month).padStart(2, "0")}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}`}>{t("See transactions")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => remove(category)} disabled={deleting} className="cursor-pointer rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense">
                  {t("Delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div key={category.id} className={rowClass}>
              {row}
            </div>
          );
        })}
      </Card>
      {canManage && (
        <Button variant="soft" size="xl" onClick={() => setDrawer("create")} className="md:hidden">
          <Plus strokeWidth={2.25} className="size-4" />
          {t("Add a category")}
        </Button>
      )}

      <div className="hidden flex-wrap items-center justify-between gap-3 md:flex">
        <h2 className="text-title text-ink">{t("Categories")}</h2>
        <div className="flex gap-4 text-caption text-ink-2">
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-[3px] bg-income" /> {t("Under 70%")}
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-[3px] bg-warning-fill" /> 70–90%
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-[3px] bg-expense-fill" /> {t("Over 90%")}
          </span>
        </div>
      </div>

      <div className="hidden gap-4 sm:grid-cols-2 md:grid lg:grid-cols-3">
        {overview.categories.map((category) => {
          const limit = Number(category.monthlyLimit ?? 0);
          const used = Number(category.spent);
          const left = limit - used;
          const tone = budgetTone(category.percent);
          const visual = categoryTone(category.color);
          const status = left > 0 ? `${formatCurrency(left, currency)} ${t("left")}` : left === 0 ? t("Limit reached") : `${t("Over by")} ${formatCurrency(-left, currency)}`;
          return (
            <Card key={category.id} className={cn("flex flex-col gap-3", tone === "expense" && "border-[#F2C9C0] dark:border-expense/40")}>
              <div className="flex items-center gap-3">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md [&_svg]:size-4.75", visual.bg, visual.fg)}>{category.icon && createElement(budgetCategoryIcon(category.icon), { "aria-hidden": true })}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-title text-ink">{category.name}</span>
                  <span className="text-caption font-normal text-ink-muted tabular-nums">
                    {t("Limit")} {formatCurrency(limit, currency)}
                  </span>
                </span>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger aria-label={`${t("More for")} ${category.name}`} className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-cream data-open:bg-cream">
                      <MoreHorizontal className="size-4.5" aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
                      <DropdownMenuItem onSelect={() => setDrawer(category)} className="cursor-pointer rounded-md px-3 py-2 text-body text-ink focus:bg-cream">
                        {t("Edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer rounded-md px-3 py-2 text-body text-ink focus:bg-cream">
                        <Link href={`/transactions?type=EXPENSE&categoryId=${encodeURIComponent(category.name)}&dateFrom=${year}-${String(month).padStart(2, "0")}-01&dateTo=${year}-${String(month).padStart(2, "0")}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}`}>{t("See transactions")}</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => remove(category)} disabled={deleting} className="cursor-pointer rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense">
                        {t("Delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <span className="text-h2 text-ink tabular-nums">
                {formatCurrency(used, currency)} <span className="text-small font-medium text-ink-muted">{t("spent")}</span>
              </span>
              <ProgressBar value={category.percent} tone="budget" label={category.name} />
              <div className={cn("flex items-center justify-between text-small font-semibold", TONE_TEXT[tone])}>
                <span className="flex items-center gap-2">
                  {tone === "expense" && <TriangleAlert className="size-3.5" strokeWidth={2.25} aria-hidden="true" />}
                  {status}
                </span>
                <span className="tabular-nums">{Math.round(category.percent)}%</span>
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
              {unassigned !== null && unassigned > 0 ? `${formatCurrency(unassigned, currency)} ${t("of your budget isn't assigned yet")}` : t("Groceries, rent, transport, bills…")}
            </span>
          </button>
        )}
      </div>

      <CategoryDrawer open={drawer !== "closed"} onClose={() => setDrawer("closed")} businessId={businessId} type="EXPENSE" editing={drawer === "closed" || drawer === "create" ? null : drawer} currency={currency} unassigned={unassigned} totalBudget={total} />
      <MonthlyBudgetDialog open={targetOpen} onClose={() => setTargetOpen(false)} businessId={businessId} current={total} currency={currency} monthName={monthName} />
      {confirmDialog}
    </PageFrame>
  );
}

function MonthlyBudgetDialog({ open, onClose, businessId, current, currency, monthName }: { open: boolean; onClose: () => void; businessId: string; current: number | null; currency: string; monthName: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const [value, setValue] = useState(current ? String(current) : "");
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
        toast.error(result.message ?? t("Failed to update total budget"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <DialogContent showCloseButton={false} className="w-110 max-w-[calc(100vw-32px)] gap-0 rounded-lg border border-line bg-surface p-6 shadow-overlay">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-h3 text-ink">{t("Monthly budget")}</DialogTitle>
            <DialogDescription className="text-body text-ink-2">
              {t("How much you plan to spend in")} {monthName}. {t("Categories share it.")}
            </DialogDescription>
          </div>
          <Input id="budget-target" type="text" inputMode="decimal" size="lg" value={value} onChange={(event) => setValue(normalizeMoneyInput(event.target.value))} leading={<span className="text-body font-semibold">{currencySymbol(currency)}</span>} autoFocus aria-label={t("Monthly budget")} className="text-h3 font-semibold tabular-nums" />
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
