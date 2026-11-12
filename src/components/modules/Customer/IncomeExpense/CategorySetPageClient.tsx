"use client";

import { ArrowDown, ArrowUp, ArrowUpRight, ChartLine, CircleAlert, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { LIST_ROW_ACTION, LIST_ROW_DELETE } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { BudgetCategoryType, CategorySet, CategorySetRow } from "@/lib/customer/api";
import { createBudgetCategoryAction } from "@/lib/customer/budgetActions";
import { CATEGORY_NAME_MAX, CATEGORY_NAME_WORDS, categoryNameProblem, categoryServerProblem } from "@/lib/customer/categoryName";
import { ieCategoryColor } from "@/lib/customer/categoryTone";
import { formatCurrency } from "@/lib/customer/currency";
import { categoryLabel } from "@/lib/customer/transactionRows";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { plural } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { type CategoriesByType, CategoryDialog, type CategoryDialogState, freeColor } from "./CategoryDialog";
import { DeleteCategoryDialog } from "./DeleteCategoryDialog";

interface CategorySetPageClientProps {
  businessId: string;
  categories: CategorySet;
  canManage: boolean;
  currency: string;
  // ?new=INCOME|EXPENSE: opens the New category popup on that type.
  openNew: BudgetCategoryType | null;
}

// The two lists, in the board's green and red (the dot and the count).
const GROUPS = [
  { key: "income" as const, type: "INCOME" as const, title: "Income categories", add: "Add income category", dot: "bg-success", badge: "bg-success-soft text-tint-green-ink", quick: "Quick add an income category…", quickLabel: "New income category name" },
  { key: "expense" as const, type: "EXPENSE" as const, title: "Expense categories", add: "Add expense category", dot: "bg-expense-fill", badge: "bg-expense-soft text-expense", quick: "Quick add an expense category…", quickLabel: "New expense category name" },
];

// Where an automatic row's money is recorded, what it says about it, and
// its link's colour.
const SOURCES = {
  zakat: { href: "/zakat", label: "Zakat", tip: "Made by the Zakat page. Zakat you pay there is listed here.", tone: "text-tint-green-ink" },
  charges: { href: "/balance/transfer", label: "Transfers", tip: "Made from transfer charges on Balance > Transfers.", tone: "text-ink-2" },
} as const;

type Tab = "all" | BudgetCategoryType;
type Sort = "used" | "amount" | "az";
const SORTS: [Sort, string][] = [
  ["used", "Most used@@categories"],
  ["amount", "Highest amount"],
  ["az", "A–Z@@categories"],
];

// The quick-add line's words: the transaction popup's, but a taken name
// says so as the New category popup does.
const QUICK_WORDS = { ...CATEGORY_NAME_WORDS.popup, taken: CATEGORY_NAME_WORDS.drawer.taken };

// How long a saved category's row stays lit.
const HIGHLIGHT_MS = 3000;

// One row of either list: a category of the workspace, or a name the app
// files money under (Zakat, a transfer's charge).
interface Item {
  key: string;
  type: BudgetCategoryType;
  name: string;
  label: string;
  color: string | null;
  count: number;
  total: number;
  source: (typeof SOURCES)[keyof typeof SOURCES] | null;
  row: CategorySetRow | null;
}

// A category's transactions, of all time.
const transactionsOf = (type: BudgetCategoryType, name: string) => `/transactions?${new URLSearchParams({ type, categoryId: name, period: "all" }).toString()}`;

// Income & Expense > Category Set (design: CategorySet): four figures, a
// search with Income / Expense tabs and a sort, then the two lists side by
// side -- each category with how many transactions use it (a way into
// them), its money of all time and its share of its side, and a quick-add
// line; the names the app files money under itself (Zakat, transfer
// charges) are changed where they come from.
export function CategorySetPageClient({ businessId, categories, canManage, currency, openNew }: CategorySetPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [editing, setEditing] = useState<CategoryDialogState | null>(openNew && canManage ? { id: null, type: openNew, name: "", color: null, used: 0 } : null);
  const [deleting, setDeleting] = useState<CategorySetRow | null>(null);
  // The category just saved, lit for a moment (the board's highlight).
  const [highlight, setHighlight] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState<Sort>("used");
  const [quick, setQuick] = useState<Record<BudgetCategoryType, string>>({ INCOME: "", EXPENSE: "" });
  const [quickError, setQuickError] = useState<Record<BudgetCategoryType, string>>({ INCOME: "", EXPENSE: "" });
  const [adding, startAdding] = useTransition();

  useEffect(() => {
    if (!highlight) return;
    const timer = setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlight]);

  const existing: CategoriesByType = {
    INCOME: { names: categories.income.map((row) => row.name), colors: categories.income.map((row) => row.color) },
    EXPENSE: { names: categories.expense.map((row) => row.name), colors: categories.expense.map((row) => row.color) },
  };
  const allColors = [...existing.INCOME.colors, ...existing.EXPENSE.colors];

  const own = (row: CategorySetRow): Item => {
    const source = row.system === "zakat" ? SOURCES.zakat : null;
    return { key: row.id, type: row.type, name: row.name, label: categoryLabel(row.name, t), color: source ? "lime" : row.color, count: row.transactionCount, total: Number(row.total ?? 0), source, row };
  };
  const items: Record<BudgetCategoryType, Item[]> = {
    INCOME: categories.income.map(own),
    EXPENSE: [
      ...categories.expense.map(own),
      ...(categories.automatic ?? []).map((row): Item => ({ key: `auto-${row.name}`, type: "EXPENSE", name: row.name, label: categoryLabel(row.name, t), color: null, count: row.transactionCount, total: Number(row.total ?? 0), source: SOURCES[row.kind], row: null })),
    ],
  };
  const everything = [...items.INCOME, ...items.EXPENSE];
  const sideTotal = (type: BudgetCategoryType) => items[type].reduce((sum, item) => sum + item.total, 0);
  const money = (figure: number) => formatCurrency(figure, currency, fmt);

  // The board's four figures: how many of each, the one most used, and how
  // many of the customer's own no transaction uses yet.
  const mostUsed = everything.reduce<Item | null>((top, item) => (item.count > (top?.count ?? 0) ? item : top), null);
  const stats = [
    { label: "Income categories", value: formatCount(items.INCOME.length, fmt), icon: <ArrowUp />, tile: "bg-success-soft text-tint-green-ink" },
    { label: "Expense categories", value: formatCount(items.EXPENSE.length, fmt), icon: <ArrowDown />, tile: "bg-expense-soft text-expense" },
    { label: "Most used@@categories", value: mostUsed?.label ?? "—", icon: <ChartLine />, tile: "bg-emerald-soft text-emerald" },
    { label: "Not used yet", value: formatCount(everything.filter((item) => !item.source && item.count === 0).length, fmt), icon: <CircleAlert />, tile: "bg-surface-sunken text-ink-soft" },
  ];

  const needle = query.trim().toLowerCase();
  const shown = (type: BudgetCategoryType) =>
    items[type]
      .filter((item) => !needle || item.name.toLowerCase().includes(needle) || item.label.toLowerCase().includes(needle))
      .sort((a, b) => (sort === "az" ? a.label.localeCompare(b.label) : sort === "amount" ? b.total - a.total : b.count - a.count));

  function quickAdd(type: BudgetCategoryType) {
    if (adding) return;
    const problem = categoryNameProblem(quick[type], existing[type].names);
    if (problem) {
      setQuickError((previous) => ({ ...previous, [type]: QUICK_WORDS[problem] }));
      return;
    }
    const name = quick[type].trim();
    startAdding(async () => {
      const result = await createBudgetCategoryAction(businessId, { type, name, icon: null, color: freeColor(allColors) });
      if (!result.success) {
        const known = categoryServerProblem(result.message);
        setQuickError((previous) => ({ ...previous, [type]: known ? QUICK_WORDS[known] : (result.message ?? "Couldn't add the category.") }));
        return;
      }
      toast.success(t("Category added"));
      setQuick((previous) => ({ ...previous, [type]: "" }));
      setHighlight(result.data?.id ?? null);
      router.refresh();
    });
  }

  return (
    <PageFrame className="gap-4 leading-[normal]">
      <PageHeader
        title={t("Category Set")}
        description={t("These names show in the category list when you add a transaction. Counts are for all time.")}
        actions={
          canManage && (
            <Button size="lg" onClick={() => setEditing({ id: null, type: "EXPENSE", name: "", color: null, used: 0 })} className="gap-1.5 px-4.5">
              <Plus strokeWidth={2.5} aria-hidden="true" />
              {t("New category")}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex min-w-0 items-center gap-3 rounded-[16px] border border-line-card bg-surface px-4 py-3.5">
            <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-[12px] [&_svg]:size-4.5", stat.tile)}>
              {stat.icon}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[12.5px] text-ink-muted">{t(stat.label)}</span>
              <span className="truncate text-[18px] font-semibold tracking-[-0.01em] text-ink">{stat.value}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[16px] border border-line-card bg-surface p-2">
        <label className="relative min-w-55 flex-[1_1_260px] sm:max-w-95">
          <span className="sr-only">{t("Search categories")}</span>
          <Search className="pointer-events-none absolute top-3 left-3 size-4 text-ink-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Search categories")}
            className="h-10 w-full rounded-[10px] border border-input bg-surface pr-3 pl-9.5 text-body text-ink outline-none placeholder:text-ink-faint focus:border-emerald focus:shadow-[0_0_0_3px_rgba(28,117,103,0.15)]"
          />
        </label>
        <div role="group" aria-label={t("Show")} className="flex gap-0.5 rounded-[12px] bg-surface-sunken p-0.75">
          {(["all", "INCOME", "EXPENSE"] as const).map((key) => {
            const on = tab === key;
            const count = key === "all" ? everything.length : items[key].length;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => setTab(key)}
                className={cn("flex h-8.5 items-center gap-1.5 rounded-[9px] px-3 text-[13.5px] font-semibold", on ? "bg-surface text-ink shadow-[0_1px_2px_rgba(18,32,29,0.10)] dark:bg-surface-raised" : "text-ink-muted hover:text-ink")}
              >
                {t(key === "all" ? "All" : key === "INCOME" ? "Income" : "Expense")}
                <span className={cn("rounded-full px-1.75 text-[12px] leading-4.5 tabular-nums", on ? "bg-emerald-soft" : "bg-line")}>{formatCount(count, fmt)}</span>
              </button>
            );
          })}
        </div>
        <span className="hidden flex-1 sm:block" />
        <span className="flex items-center gap-3">
          <label htmlFor="category-sort" className="text-small text-ink-muted">
            {t("Sort")}
          </label>
          <NativeSelect id="category-sort" size="sm" value={sort} onChange={(event) => setSort(event.target.value as Sort)} frameClassName="h-10" className="h-10 rounded-[10px] text-[13.5px] font-normal">
            {SORTS.map(([value, label]) => (
              <option key={value} value={value}>
                {t(label)}
              </option>
            ))}
          </NativeSelect>
        </span>
      </div>

      <div className={cn("grid items-start gap-4", tab === "all" && "lg:grid-cols-2")}>
        {GROUPS.filter((group) => tab === "all" || tab === group.type).map((group) => {
          const rows = shown(group.type);
          const headingId = `grp-${group.key}`;
          const total = sideTotal(group.type);
          return (
            <Card key={group.key} padding="none" className="overflow-hidden rounded-[18px]" role="region" aria-labelledby={headingId}>
              <div className="flex items-center gap-2.5 border-b border-line py-3 pr-3 pl-5">
                <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full", group.dot)} />
                <h2 id={headingId} className="text-title font-semibold whitespace-nowrap text-ink">
                  {t(group.title)}
                </h2>
                <span className={cn("rounded-full px-2.5 py-0.5 text-small font-semibold tabular-nums", group.badge)}>{formatCount(items[group.type].length, fmt)}</span>
                <span className="flex-1" />
                <span className="hidden text-[12.5px] whitespace-nowrap text-ink-muted tabular-nums sm:inline">{t("{amount} all time", { amount: money(total) })}</span>
                {canManage && (
                  <Button variant="ghost" size="sm" onClick={() => setEditing({ id: null, type: group.type, name: "", color: null, used: 0 })} aria-label={t(group.add)} className="h-9 gap-1 px-3 text-[13.5px] text-emerald hover:bg-emerald-soft hover:text-emerald">
                    <Plus strokeWidth={2.5} className="size-3.75" aria-hidden="true" />
                    {t("Add")}
                  </Button>
                )}
              </div>
              <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_132px_96px] gap-3 border-b border-divider bg-head-wash py-2 pr-3 pl-5 text-[11.5px] font-semibold tracking-[0.04em] text-ink-muted uppercase sm:grid">
                <span>{t("Category")}</span>
                <span>{t("All-time total")}</span>
                <span />
              </div>
              {rows.length === 0 ? (
                <p className="border-b border-divider p-5 text-body text-ink-muted">{needle ? t("No category matches “{query}”", { query: query.trim() }) : t("No categories yet.")}</p>
              ) : (
                <ul>
                  {rows.map((item) => (
                    <CategoryRow key={item.key} item={item} sideTotal={total} money={money} lit={item.key === highlight}>
                      {canManage && item.row && !item.source && (
                        <>
                          <button
                            type="button"
                            onClick={() => item.row && setEditing({ id: item.row.id, type: item.type, name: item.name, color: item.row.color, used: item.count })}
                            aria-label={t("Edit {name}", { name: item.label })}
                            title={t("Edit")}
                            className={LIST_ROW_ACTION}
                          >
                            <Pencil aria-hidden="true" />
                          </button>
                          <button type="button" onClick={() => setDeleting(item.row)} aria-label={t("Delete {name}", { name: item.label })} title={t("Delete")} className={cn(LIST_ROW_ACTION, LIST_ROW_DELETE)}>
                            <Trash2 aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </CategoryRow>
                  ))}
                </ul>
              )}
              {canManage && (
                <form
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    quickAdd(group.type);
                  }}
                  className="bg-head-wash"
                >
                  <div className="flex items-center gap-2.5 py-3 pr-3 pl-5">
                    <span aria-hidden="true" style={{ "--cat": ieCategoryColor(freeColor(allColors)) } as React.CSSProperties} className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border-[1.5px] border-dashed border-(--cat) text-(--cat)">
                      <Plus className="size-4" strokeWidth={2.25} />
                    </span>
                    <input
                      type="text"
                      maxLength={CATEGORY_NAME_MAX}
                      aria-label={t(group.quickLabel)}
                      aria-invalid={!!quickError[group.type] || undefined}
                      placeholder={t(group.quick)}
                      value={quick[group.type]}
                      onChange={(event) => {
                        const value = event.target.value;
                        setQuick((previous) => ({ ...previous, [group.type]: value }));
                        setQuickError((previous) => ({ ...previous, [group.type]: "" }));
                      }}
                      className={cn("h-10 min-w-0 flex-1 rounded-[10px] border bg-surface px-3 text-body text-ink outline-none placeholder:text-ink-faint focus:border-emerald focus:shadow-[0_0_0_3px_rgba(28,117,103,0.15)]", quickError[group.type] ? "border-expense-fill" : "border-input")}
                    />
                    <button type="submit" disabled={adding} className="h-10 shrink-0 rounded-full border border-emerald bg-surface px-4 text-[13.5px] font-semibold whitespace-nowrap text-emerald hover:bg-emerald-soft disabled:opacity-60">
                      {t("Add")}
                    </button>
                  </div>
                  {quickError[group.type] && (
                    <p role="alert" className="pr-5 pb-3 pl-17.5 text-[12.5px] text-expense">
                      {t(quickError[group.type])}
                    </p>
                  )}
                </form>
              )}
            </Card>
          );
        })}
      </div>

      <CategoryDialog
        businessId={businessId}
        editing={editing}
        existing={existing}
        onClose={() => setEditing(null)}
        onSaved={(id) => {
          setHighlight(id);
          router.refresh();
        }}
      />
      {deleting && (
        <DeleteCategoryDialog
          businessId={businessId}
          row={deleting}
          others={categories[deleting.type === "INCOME" ? "income" : "expense"].filter((row) => row.id !== deleting.id && row.system !== "zakat")}
          onClose={() => setDeleting(null)}
          onDeleted={() => router.refresh()}
        />
      )}
    </PageFrame>
  );
}

// One category: its letter on its colour, its name, how many transactions
// use it (a way into them), its money of all time with its share of its
// side, and its buttons -- or, for one the app keeps, "Automatic" and the
// page it comes from.
function CategoryRow({ item, sideTotal, money, lit = false, children }: { item: Item; sideTotal: number; money: (figure: number) => string; lit?: boolean; children?: React.ReactNode }) {
  const { t, fmt } = useLocale();
  const share = sideTotal > 0 ? Math.round((item.total / sideTotal) * 100) : 0;
  const color = item.color ? ieCategoryColor(item.color) : "var(--ink-faint)";
  return (
    <li
      style={{ "--cat": color } as React.CSSProperties}
      className={cn(
        "grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-divider py-2 pr-3 pl-5 transition-colors duration-500 hover:bg-hover sm:grid-cols-[minmax(0,1fr)_132px_96px]",
        lit && "bg-emerald-soft hover:bg-emerald-soft",
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="cat-tile flex size-10 shrink-0 items-center justify-center rounded-[12px] text-title font-bold">
          {[...item.label][0]?.toUpperCase()}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            <span title={item.label} className="truncate text-body font-semibold text-ink">
              {item.label}
            </span>
            {item.source && (
              <span title={t(item.source.tip)} className="shrink-0 rounded-full bg-success-soft/50 px-2 py-px text-[11.5px] font-semibold text-tint-green-ink">
                {t("Automatic")}
              </span>
            )}
          </span>
          {item.count > 0 ? (
            <Link href={transactionsOf(item.type, item.name)} title={t("See its transactions")} className="w-fit text-small text-ink-muted hover:text-emerald hover:underline">
              {plural(t, item.count, "{count} transaction", "{count} transactions", undefined, fmt)}
            </Link>
          ) : (
            <span className="text-small text-ink-muted">{t("Not used yet")}</span>
          )}
        </span>
      </span>
      <span className="order-last col-span-2 flex min-w-0 flex-col gap-1.5 sm:order-0 sm:col-span-1">
        <span className={cn("flex items-baseline justify-between gap-1.5 text-[13.5px] font-semibold whitespace-nowrap tabular-nums", item.total > 0 ? "text-ink" : "text-ink-muted")}>
          <span>{item.total > 0 ? money(item.total) : "—"}</span>
          <span className="text-[12px] font-medium text-ink-muted">{toLocaleDigits(`${share}%`, fmt)}</span>
        </span>
        <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-surface-sunken">
          <span className="block h-1.5 rounded-full bg-(--cat)" style={{ width: `${share}%` }} />
        </span>
      </span>
      {item.source ? (
        <Link href={item.source.href} title={t(item.source.tip)} className={cn("flex h-8.5 items-center gap-1 justify-self-end rounded-full px-3 text-[12.5px] font-semibold whitespace-nowrap hover:bg-surface-sunken", item.source.tone)}>
          {t(item.source.label)}
          <ArrowUpRight className="size-3.25" strokeWidth={2.5} aria-hidden="true" />
        </Link>
      ) : (
        <span className="flex justify-end gap-1.5">{children}</span>
      )}
    </li>
  );
}
