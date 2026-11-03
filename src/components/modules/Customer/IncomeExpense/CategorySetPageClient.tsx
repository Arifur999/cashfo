"use client";

import { ArrowUpRight, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { LIST_ROW_ACTION, LIST_ROW_DELETE } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { BudgetCategoryType, CategorySet, CategorySetRow } from "@/lib/customer/api";
import { addStarterCategoriesAction } from "@/lib/customer/budgetActions";
import { categoryTone } from "@/lib/customer/categoryTone";
import { categoryLabel } from "@/lib/customer/transactionRows";
import { formatCount } from "@/lib/i18n/digits";
import { plural } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { type CategoriesByType, CategoryDialog, type CategoryDialogState } from "./CategoryDialog";
import { DeleteCategoryDialog } from "./DeleteCategoryDialog";

interface CategorySetPageClientProps {
  businessId: string;
  categories: CategorySet;
  canManage: boolean;
  // ?new=INCOME|EXPENSE: opens the New category popup on that type.
  openNew: BudgetCategoryType | null;
}

const GROUPS = [
  { key: "income" as const, type: "INCOME" as const, title: "Income categories", add: "Add income category", dot: "bg-income", chip: "income" as const },
  { key: "expense" as const, type: "EXPENSE" as const, title: "Expense categories", add: "Add expense category", dot: "bg-expense", chip: "expense" as const },
];

// Where an automatic row's money is recorded, and what it says about it.
const SOURCES = {
  zakat: { href: "/zakat", label: "Zakat page", tip: "Made by the Zakat page. Zakat you pay there is listed here." },
  charges: { href: "/balance/transfer", label: "Transfers page", tip: "Made from transfer charges on Balance > Transfers." },
} as const;

// A category's transactions, of all time.
const transactionsOf = (type: BudgetCategoryType, name: string) => `/transactions?${new URLSearchParams({ type, categoryId: name, period: "all" }).toString()}`;

// Income & Expense > Category Set (design: CategorySet): the names the
// Transactions form offers, income and expense side by side, each with how
// many transactions use it (a way into them), and the names the app files
// money under itself (Zakat, transfer charges), changed where they come from.
export function CategorySetPageClient({ businessId, categories, canManage, openNew }: CategorySetPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [editing, setEditing] = useState<CategoryDialogState | null>(openNew && canManage ? { id: null, type: openNew, name: "", color: null, used: 0 } : null);
  const [deleting, setDeleting] = useState<CategorySetRow | null>(null);
  const [isAdding, startAdding] = useTransition();
  const automatic = categories.automatic ?? [];

  const existing: CategoriesByType = {
    INCOME: { names: categories.income.map((row) => row.name), colors: categories.income.map((row) => row.color) },
    EXPENSE: { names: categories.expense.map((row) => row.name), colors: categories.expense.map((row) => row.color) },
  };

  function addStarters() {
    startAdding(async () => {
      const result = await addStarterCategoriesAction(businessId);
      if (result.success) {
        toast.success(t("Categories added"));
        router.refresh();
      } else {
        toast.error(t(result.message ?? "Failed to add the categories"));
      }
    });
  }

  return (
    <PageFrame>
      <PageHeader
        title={t("Category Set")}
        description={t("These names show in the category list when you add a transaction. Counts are for all time.")}
        actions={
          canManage && (
            <Button onClick={() => setEditing({ id: null, type: "EXPENSE", name: "", color: null, used: 0 })} className="rounded-full px-4.5">
              <Plus strokeWidth={2.5} aria-hidden="true" />
              {t("New category")}
            </Button>
          )
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {GROUPS.map((group) => {
          const rows = categories[group.key];
          const extra = group.type === "EXPENSE" ? automatic : [];
          const headingId = `grp-${group.key}`;
          return (
            <Card key={group.key} padding="none" className="overflow-hidden" role="region" aria-labelledby={headingId}>
              <div className="flex items-center gap-2.5 border-b border-divider py-3.5 pr-3 pl-5">
                <span aria-hidden="true" className={cn("size-2.5 rounded-full", group.dot)} />
                <h2 id={headingId} className="text-title font-semibold text-ink">
                  {t(group.title)}
                </h2>
                <Chip tone={group.chip} size="sm" className="tabular-nums">
                  {formatCount(rows.length + extra.length, fmt)}
                </Chip>
                <span className="flex-1" />
                {canManage && (
                  <Button variant="ghost" size="sm" onClick={() => setEditing({ id: null, type: group.type, name: "", color: null, used: 0 })} aria-label={t(group.add)} className="text-emerald hover:text-emerald">
                    <Plus strokeWidth={2.5} aria-hidden="true" />
                    {t("Add")}
                  </Button>
                )}
              </div>
              {rows.length === 0 && extra.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
                  <p className="text-small text-ink-muted">{t("No categories yet.")}</p>
                  {canManage && (
                    <Button variant="secondary" size="sm" onClick={addStarters} disabled={isAdding} className="rounded-full">
                      {t("Add the usual ones")}
                    </Button>
                  )}
                </div>
              ) : (
                <ul>
                  {rows.map((row) => {
                    const source = row.system === "zakat" ? SOURCES.zakat : null;
                    return (
                      <CategoryRow key={row.id} name={categoryLabel(row.name, t)} color={row.color} count={row.transactionCount} href={transactionsOf(row.type, row.name)} source={source}>
                        {canManage && !source && (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditing({ id: row.id, type: row.type, name: row.name, color: row.color, used: row.transactionCount })}
                              aria-label={t("Edit {name}", { name: categoryLabel(row.name, t) })}
                              title={t("Edit")}
                              className={LIST_ROW_ACTION}
                            >
                              <Pencil className="size-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(row)}
                              aria-label={t("Delete {name}", { name: categoryLabel(row.name, t) })}
                              title={t("Delete")}
                              className={cn(LIST_ROW_ACTION, LIST_ROW_DELETE)}
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </button>
                          </>
                        )}
                      </CategoryRow>
                    );
                  })}
                  {extra.map((row) => (
                    <CategoryRow key={`auto-${row.name}`} name={categoryLabel(row.name, t)} color={null} count={row.transactionCount} href={transactionsOf(row.type, row.name)} source={SOURCES[row.kind]} />
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <CategoryDialog businessId={businessId} editing={editing} existing={existing} onClose={() => setEditing(null)} onSaved={() => router.refresh()} />
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
// use it (a way into them), and its buttons -- or, for one the app keeps,
// "Automatic" and the page it comes from.
function CategoryRow({
  name,
  color,
  count,
  href,
  source,
  children,
}: {
  name: string;
  color: string | null;
  count: number;
  href: string;
  source: (typeof SOURCES)[keyof typeof SOURCES] | null;
  children?: React.ReactNode;
}) {
  const { t, fmt } = useLocale();
  const tone = categoryTone(color);
  return (
    <li className="flex min-h-16 items-center gap-3 border-b border-divider py-2.5 pr-3 pl-5 last:border-b-0">
      <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-[12px] text-title font-bold", tone.bg, tone.fg)}>
        {[...name][0]?.toUpperCase()}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-body font-semibold text-ink">{name}</span>
          {source && (
            <Chip tone="income" size="sm" className="h-auto shrink-0 py-0.5 text-[11px] font-semibold" title={t(source.tip)}>
              {t("Automatic")}
            </Chip>
          )}
        </span>
        {count > 0 ? (
          <Link href={href} title={t("See its transactions")} className="w-fit text-small text-ink-muted hover:text-emerald hover:underline">
            {plural(t, count, "{count} transaction", "{count} transactions", undefined, fmt)}
          </Link>
        ) : (
          <span className="text-small text-ink-faint">{t("Not used yet")}</span>
        )}
      </span>
      {source ? (
        <Link href={source.href} title={t(source.tip)} className="flex shrink-0 items-center gap-1 rounded-sm text-small font-semibold text-ink-2 hover:text-emerald hover:underline">
          {t(source.label)}
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      ) : (
        <span className="flex shrink-0 gap-2">{children}</span>
      )}
    </li>
  );
}
