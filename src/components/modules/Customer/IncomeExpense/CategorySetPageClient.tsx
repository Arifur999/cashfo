"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { CategorySet, CategorySetRow } from "@/lib/customer/api";
import { deleteBudgetCategoryAction } from "@/lib/customer/budgetActions";
import { categoryTone } from "@/lib/customer/categoryTone";
import { formatCount } from "@/lib/i18n/digits";
import { plural } from "@/lib/i18n/message";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CategoryDialog, type CategoryDialogState } from "./CategoryDialog";

interface CategorySetPageClientProps {
  businessId: string;
  categories: CategorySet;
  canManage: boolean;
  // ?new=INCOME|EXPENSE (the transaction popup's "Add new category"): opens
  // the New category popup on that kind.
  openNew: "INCOME" | "EXPENSE" | null;
}

const GROUPS = [
  { key: "income" as const, title: "Income categories", dot: "bg-income", badge: "bg-income-soft text-income" },
  { key: "expense" as const, title: "Expense categories", dot: "bg-expense", badge: "bg-expense-soft text-expense" },
];

// Income & Expense > Category Set: the names the Transactions form offers,
// income and expense side by side, each with how many transactions use it.
export function CategorySetPageClient({ businessId, categories, canManage, openNew }: CategorySetPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [editing, setEditing] = useState<CategoryDialogState | null>(openNew && canManage ? { id: null, type: openNew, name: "" } : null);
  const [deleting, setDeleting] = useState<CategorySetRow | null>(null);
  const [isDeleting, startDelete] = useTransition();

  function remove() {
    if (!deleting) return;
    startDelete(async () => {
      const result = await deleteBudgetCategoryAction(businessId, deleting.id);
      if (result.success) {
        toast.success(t("Category deleted"));
        setDeleting(null);
        router.refresh();
      } else {
        toast.error(t(result.message ?? "Failed to delete category"));
      }
    });
  }

  return (
    <PageFrame>
      <PageHeader
        title={t("Category Set")}
        description={t("These names show in the category list when you add a transaction.")}
        actions={
          canManage && (
            <Button onClick={() => setEditing({ id: null, type: "EXPENSE", name: "" })} className="rounded-full px-4.5">
              <Plus strokeWidth={2.5} aria-hidden="true" />
              {t("New category")}
            </Button>
          )
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {GROUPS.map((group) => {
          const rows = categories[group.key];
          const headingId = `grp-${group.key}`;
          return (
            <Card key={group.key} padding="none" className="overflow-hidden" role="region" aria-labelledby={headingId}>
              <div className="flex items-center gap-2.5 border-b border-divider px-5 py-4">
                <span aria-hidden="true" className={cn("size-2.5 rounded-full", group.dot)} />
                <h2 id={headingId} className="flex-1 text-title font-semibold text-ink">
                  {t(group.title)}
                </h2>
                <span className={cn("rounded-full px-2.5 py-0.5 text-small font-semibold tabular-nums", group.badge)}>{formatCount(rows.length, fmt)}</span>
              </div>
              {rows.length === 0 ? (
                <p className="px-5 py-8 text-center text-small text-ink-muted">{t(group.key === "income" ? "No income categories yet." : "No expense categories yet.")}</p>
              ) : (
                <ul>
                  {rows.map((row) => {
                    const tone = categoryTone(row.color);
                    return (
                      <li key={row.id} className="flex h-16 items-center gap-3 border-b border-divider pr-3 pl-5 last:border-b-0">
                        <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-[12px] text-title font-bold", tone.bg, tone.fg)}>
                          {[...row.name][0]?.toUpperCase()}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-body font-semibold text-ink">{row.name}</span>
                          <span className="text-small text-ink-muted">{plural(t, row.transactionCount, "{count} transaction", "{count} transactions", undefined, fmt)}</span>
                        </span>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditing({ id: row.id, type: row.type, name: row.name })}
                              aria-label={t("Edit {name}", { name: row.name })}
                              title={t("Edit")}
                              className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-surface-sunken"
                            >
                              <Pencil className="size-4.25" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(row)}
                              aria-label={t("Delete {name}", { name: row.name })}
                              title={t("Delete")}
                              className="flex size-11 shrink-0 items-center justify-center rounded-full text-expense hover:bg-expense-soft"
                            >
                              <Trash2 className="size-4.25" aria-hidden="true" />
                            </button>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <CategoryDialog businessId={businessId} editing={editing} onClose={() => setEditing(null)} onSaved={() => router.refresh()} />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title={t("Delete {name}?", { name: deleting?.name ?? "" })}
        description={
          deleting && deleting.transactionCount > 0
            ? plural(t, deleting.transactionCount, "Its {count} transaction keeps the name; it just won't be offered for new ones.", "Its {count} transactions keep the name; it just won't be offered for new ones.", undefined, fmt)
            : t("It won't be offered for new transactions.")
        }
        confirmLabel={t("Delete")}
        danger
        isPending={isDeleting}
      />
    </PageFrame>
  );
}
