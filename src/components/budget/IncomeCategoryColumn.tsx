"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { BudgetCategorySummary, BudgetOverview } from "@/lib/api";
import { deleteBudgetCategoryAction } from "@/lib/budgetActions";
import { budgetCategoryColorClass, budgetCategoryIcon } from "@/lib/budgetCategoryVisuals";
import { formatCurrency } from "@/lib/currency";

interface IncomeCategoryColumnProps {
  businessId: string;
  overview: BudgetOverview;
  currency: string;
  canManage: boolean;
  dateFrom: string;
  dateTo: string;
  onEdit: (category: BudgetCategorySummary) => void;
}

// Left/right half of the merged /categories page (see CategoriesPageClient,
// which owns the shared header/month-nav/Add-Category control/modal) -- this
// is just the Income side's list, adapted from the former standalone
// IncomeCategoryPageClient. Unlike Expense Category, income categories carry
// no per-category goal at all: just a name/icon/color and how much came in
// this month.
export function IncomeCategoryColumn({ businessId, overview, currency, canManage, dateFrom, dateTo, onEdit }: IncomeCategoryColumnProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete(category: BudgetCategorySummary) {
    if (!window.confirm(`Delete the "${category.name}" category? This won't affect past transactions.`)) return;
    setDeletingId(category.id);
    startDeleteTransition(async () => {
      const result = await deleteBudgetCategoryAction(businessId, category.id);
      if (result.success) {
        toast.success("Category deleted");
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to delete category");
      }
      setDeletingId(null);
    });
  }

  const totalEarned = overview.categories.reduce((sum, c) => sum + Number(c.spent), 0);

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Income Categories</h2>

      <div className="mb-4 rounded-2xl bg-surface px-4 py-3 text-sm text-neutral-600 shadow-sm shadow-black/5">
        Total earned this month: <span className="font-semibold text-neutral-900">{formatCurrency(totalEarned, currency)}</span>
      </div>

      {overview.categories.length === 0 ? (
        <div className="rounded-2xl bg-surface px-4 py-10 text-center text-sm text-neutral-400 shadow-sm shadow-black/5">
          No categories yet -- tap &quot;Add Category&quot; to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {overview.categories.map((category) => {
            const Icon = category.icon ? budgetCategoryIcon(category.icon) : null;
            return (
              <div key={category.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${budgetCategoryColorClass(category.color)}`}>
                    {Icon && <Icon className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900">{category.name}</p>
                    <Link
                      href={`/transactions?type=INCOME&categoryId=${encodeURIComponent(category.name)}&dateFrom=${dateFrom}&dateTo=${dateTo}`}
                      className="text-sm text-brand-primary hover:underline"
                    >
                      View Transactions
                    </Link>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold text-neutral-900">{formatCurrency(category.spent, currency)}</span>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(category)}
                        title="Edit"
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === category.id && isDeleting}
                        onClick={() => handleDelete(category)}
                        title="Delete"
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-brand-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
