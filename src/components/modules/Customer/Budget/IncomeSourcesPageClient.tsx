"use client";

import { ArrowRight, MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createElement, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import Card from "@/components/smartly/Card";
import EmptyState from "@/components/smartly/EmptyState";
import PageFrame from "@/components/smartly/PageFrame";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { BudgetCategorySummary, BudgetOverview } from "@/lib/customer/api";
import { deleteBudgetCategoryAction } from "@/lib/customer/budgetActions";
import { categoryIconFor } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { formatCurrency } from "@/lib/customer/currency";
import { categoryTransactionsHref } from "@/lib/customer/transactionRows";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BudgetPlanningHeader } from "./BudgetPlanningHeader";
import { type BudgetPath, fastestGrowing, incomeShares, outsideCategories } from "./budgetFigures";
import { CategoryDrawer } from "./CategoryDrawer";
import { monthLabel, monthOnlyLabel } from "./MonthSwitcher";

interface IncomeSourcesPageClientProps {
  businessId: string;
  // The address the page is on, kept when the month changes.
  path: BudgetPath;
  overview: BudgetOverview;
  // How many categories each tab has.
  counts: { expense: number; income: number };
  // Earned per category the month before the one on show, and in its year
  // so far, by name.
  lastMonth: Record<string, number>;
  thisYear: Record<string, number>;
  // Every income of the month, with a category or not; null on an older
  // backend, when the categories' own sums stand in.
  monthTotal: number | null;
  currency: string;
  canManage: boolean;
  // Opened straight into Add income category (from the New transaction drawer).
  openAdd: boolean;
  // This month in the platform timezone, so a past month isn't called "this month".
  today: { year: number; month: number };
}

const MENU_TRIGGER = "flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11";
const MENU_ITEM = "cursor-pointer rounded-md px-3 py-2 text-body text-ink focus:bg-surface-sunken";

// Budget planning, Income categories (design-v4 BudgetIncome): what the
// month earned with each category's share of it, then a card per income
// category. Income categories have no limit.
export function IncomeSourcesPageClient({ businessId, path, overview, counts, lastMonth, thisYear, monthTotal, currency, canManage, openAdd, today }: IncomeSourcesPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  // Asked from a link (?addType=INCOME, the New transaction drawer's): Add
  // income category opens, also when this page is already open, as a new
  // query keeps the page's state. Read off the address, not the server's
  // prop alone, which stays true once the ask is taken off below.
  const asked = openAdd && searchParams.get("addType") === "INCOME";
  const [drawer, setDrawer] = useState<"closed" | "create" | BudgetCategorySummary>(asked ? "create" : "closed");
  const [seenAsk, setSeenAsk] = useState(asked);
  if (asked !== seenAsk) {
    setSeenAsk(asked);
    if (asked) setDrawer("create");
  }
  const [, startDelete] = useTransition();
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

  const { month, year } = overview;
  const isCurrentMonth = year === today.year && month === today.month;
  const monthName = monthLabel(month, year, locale);
  const previousName = month === 1 ? monthLabel(12, year - 1, locale) : monthLabel(month - 1, year, locale);
  const yearText = toLocaleDigits(String(year), locale);
  const categories = overview.categories;
  const categorized = categories.reduce((sum, c) => sum + Number(c.spent), 0);
  // The month's real income; the categories' sums leave some out.
  const total = monthTotal ?? categorized;
  const outside = outsideCategories(monthTotal, categorized);
  const shares = incomeShares(categories, total);
  const growth = fastestGrowing(
    categories.map((c) => ({ name: c.name, amount: Number(c.spent) })),
    lastMonth,
  );
  const money = (value: number | string) => formatCurrency(value, currency, locale);
  const percent = (value: number) => formatCount(Math.round(value), locale);
  const shareOf = (amount: number) => (total > 0 ? (amount / total) * 100 : 0);

  function goToMonth(nextMonth: number, nextYear: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("month", String(nextMonth));
    next.set("year", String(nextYear));
    next.delete("addType");
    startSwitch(() => router.push(`${path}?${next.toString()}`));
  }

  async function remove(category: BudgetCategorySummary) {
    if (!(await confirm({ title: t("Delete {name}?", { name: category.name }), message: t("Past transactions keep this category's name."), confirmLabel: "Delete category" }))) return;
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

  // A category's actions, for an owner or accountant; anyone gets to its
  // month's transactions from the card's own link.
  const menu = (category: BudgetCategorySummary) => (
    <DropdownMenuContent align="end" className="w-52 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
      <DropdownMenuItem onSelect={() => setDrawer(category)} className={MENU_ITEM}>
        {t("Edit")}
      </DropdownMenuItem>
      <DropdownMenuItem asChild className={MENU_ITEM}>
        <Link href={categoryTransactionsHref("INCOME", category.name, year, month)}>{t("See transactions")}</Link>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => remove(category)} className="cursor-pointer rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense">
        {t("Delete")}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  // Each card's year so far, under its name as an expense card has its limit.
  const yearLine = (amount: number) =>
    isCurrentMonth ? t("This year {amount}", { amount: money(amount) }) : year < today.year ? t("{year}: {amount}", { year: yearText, amount: money(amount) }) : t("{year} so far: {amount}", { year: yearText, amount: money(amount) });

  return (
    <PageFrame className="gap-5">
      <BudgetPlanningHeader tab="income" path={path} month={month} year={year} counts={counts} onMonthChange={goToMonth} onAdd={canManage ? () => setDrawer("create") : undefined} />

      <div aria-busy={switching || undefined} className={cn("flex flex-col gap-5 transition-opacity", switching && "opacity-60")}>
        <Card padding="none" className="flex flex-col gap-4 px-5 py-5 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-1.5">
              <span className="text-small font-medium text-ink-muted">{t("Earned in {month}", { month: isCurrentMonth || year === today.year ? monthOnlyLabel(month, locale) : monthName })}</span>
              <span className={cn("text-amount-lg tabular-nums", total > 0 ? "text-income" : "text-ink-faint")}>{total > 0 ? `+ ${money(total)}` : money(0)}</span>
            </div>
            <span className="flex max-w-90 flex-col gap-1 text-small leading-normal text-ink-muted md:text-right">
              <span>{t("Income categories have no limit. They show where your money comes from.")}</span>
              {growth && (
                <span>
                  {isCurrentMonth
                    ? t("{name} grew {percent}% since last month", { name: growth.name, percent: percent(growth.percent) })
                    : t("{name} grew {percent}% from {previous}", { name: growth.name, percent: percent(growth.percent), previous: previousName })}
                </span>
              )}
            </span>
          </div>
          <span
            role="img"
            aria-label={shares.length > 0 ? t("Income by category: {list}", { list: shares.map((s) => `${s.name} ${percent(s.share)}%`).join(", ") }) : t("Nothing came in yet this month")}
            className="flex h-3 gap-0.75 overflow-hidden rounded-full bg-surface-sunken"
          >
            {shares.map((s) => (
              <span key={s.id} className={cn("h-full bg-current", categoryTone(s.color).fg)} style={{ width: `${s.share}%` }} />
            ))}
          </span>
          {(shares.length > 0 || outside > 0) && (
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {shares.map((s) => (
                <span key={s.id} className="flex items-center gap-2 text-small">
                  <span className={cn("size-2.5 rounded-[3px] bg-current", categoryTone(s.color).fg)} />
                  <span className="text-ink-2">{s.name}</span>
                  <span className="font-semibold text-ink tabular-nums">{money(s.amount)}</span>
                  <span className="text-ink-muted tabular-nums">{toPercentText(percent(s.share))}</span>
                </span>
              ))}
              {outside > 0 && <span className="text-small text-ink-muted">{t("{amount} came in without a category", { amount: money(outside) })}</span>}
            </div>
          )}
        </Card>

        {categories.length === 0 && !canManage ? (
          <EmptyState icon={<Plus />} title={t("No income categories yet")} description={t("Salary, business, rent, commission…")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const amount = Number(category.spent);
              const share = shareOf(amount);
              const visual = categoryTone(category.color);
              const yearAmount = thisYear[category.name];
              return (
                <Card key={category.id} padding="none" className="flex flex-col gap-3 p-4.5">
                  <div className="flex items-center gap-3">
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-4.75", visual.bg, visual.fg)}>{createElement(categoryIconFor(category), { "aria-hidden": true })}</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-px">
                      <span className="truncate text-[15px] font-semibold text-ink">{category.name}</span>
                      {yearAmount ? <span className="text-caption text-ink-muted tabular-nums">{yearLine(yearAmount)}</span> : null}
                    </span>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger aria-label={t("{name}: actions", { name: category.name })} className={MENU_TRIGGER}>
                          <MoreHorizontal className="size-4.5" aria-hidden="true" />
                        </DropdownMenuTrigger>
                        {menu(category)}
                      </DropdownMenu>
                    )}
                  </div>
                  <span className={cn("text-[20px] font-bold tracking-[-0.01em] tabular-nums", amount > 0 ? "text-income" : "text-ink-faint")}>{amount > 0 ? `+ ${money(amount)}` : money(0)}</span>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                    <span className={cn("block h-full rounded-full bg-current", visual.fg)} style={{ width: `${share}%` }} />
                  </span>
                  <div className="flex items-center justify-between gap-3 text-small">
                    <span className="text-ink-muted">
                      {amount > 0
                        ? t(isCurrentMonth ? "{percent}% of this month’s income" : "{percent}% of {month}’s income", { percent: percent(share), month: monthOnlyLabel(month, locale) })
                        : isCurrentMonth
                          ? t("No income here yet this month")
                          : t("No income here in {month}", { month: monthName })}
                    </span>
                    <Link href={categoryTransactionsHref("INCOME", category.name, year, month)} className="flex shrink-0 items-center gap-1 font-semibold text-emerald hover:text-emerald-hover">
                      {t("Transactions")}
                      <ArrowRight className="size-3.25" strokeWidth={2.25} aria-hidden="true" />
                    </Link>
                  </div>
                </Card>
              );
            })}
            {canManage && (
              <button type="button" onClick={() => setDrawer("create")} className="flex min-h-37 flex-col items-center justify-center gap-2 rounded-md border-[1.5px] border-dashed border-input bg-surface p-5 text-center transition-colors hover:border-emerald dark:border-line-strong">
                <span className="flex size-10 items-center justify-center rounded-[10px] bg-emerald-soft text-emerald">
                  <Plus className="size-4.5" strokeWidth={2.5} aria-hidden="true" />
                </span>
                <span className="text-body font-semibold text-ink">{t("Add income category")}</span>
                <span className="text-caption text-ink-muted">{t("Salary, business, rent, commission…")}</span>
              </button>
            )}
          </div>
        )}
      </div>

      <CategoryDrawer
        open={drawer !== "closed"}
        onClose={() => setDrawer("closed")}
        businessId={businessId}
        type="INCOME"
        editing={drawer === "closed" || drawer === "create" ? null : drawer}
        currency={currency}
        existingNames={categories.map((c) => c.name)}
      />
      {confirmDialog}
    </PageFrame>
  );
}

// "45%" in the reader's digits ("৪৫%").
const toPercentText = (digits: string) => `${digits}%`;
