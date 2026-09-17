"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { BudgetCategorySummary, BudgetOverview } from "@/lib/api";
import { deleteBudgetCategoryAction, updateBudgetTargetAction } from "@/lib/budgetActions";
import { budgetCategoryColorClass, budgetCategoryIcon, budgetProgressColorClass } from "@/lib/budgetCategoryVisuals";
import { formatCurrency } from "@/lib/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface ExpenseCategoryColumnProps {
  businessId: string;
  overview: BudgetOverview;
  currency: string;
  canManage: boolean;
  dateFrom: string;
  dateTo: string;
  onEdit: (category: BudgetCategorySummary) => void;
}

// Right half of the merged /categories page (see IncomeCategoryColumn's own
// comment for the left half) -- adapted from the former standalone
// BudgetPlanningPageClient. Unlike Income Category, every Expense category
// carries its own spending limit, tracked here with a progress bar, plus the
// one overall "Manage Budget" total target editor.
export function ExpenseCategoryColumn({ businessId, overview, currency, canManage, dateFrom, dateTo, onEdit }: ExpenseCategoryColumnProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [targetInput, setTargetInput] = useState(overview.totalBudget ?? "");
  const [savingTarget, startTargetTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleUpdateTarget() {
    const amount = Number(targetInput);
    if (!(amount > 0)) {
      toast.error(t("Enter a total budget greater than zero"));
      return;
    }
    startTargetTransition(async () => {
      const result = await updateBudgetTargetAction(businessId, amount);
      if (result.success) {
        toast.success(t("Total budget updated"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to update total budget"));
      }
    });
  }

  function handleDelete(category: BudgetCategorySummary) {
    const confirmMessage = t('Delete the "{name}" category? This won\'t affect past transactions.').replace("{name}", category.name);
    if (!window.confirm(confirmMessage)) return;
    setDeletingId(category.id);
    startDeleteTransition(async () => {
      const result = await deleteBudgetCategoryAction(businessId, category.id);
      if (result.success) {
        toast.success(t("Category deleted"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to delete category"));
      }
      setDeletingId(null);
    });
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">{t("Expense Categories")}</h2>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 shadow-sm shadow-black/5">
        <p className="text-sm text-neutral-600">
          {t("Total budget:")}{" "}
          <span className="font-semibold text-neutral-900">{overview.totalBudget ? formatCurrency(overview.totalBudget, currency) : t("Not set")}</span>
          <span className="mx-2 text-neutral-300">|</span>
          {t("Allocated:")} <span className="font-semibold text-neutral-900">{formatCurrency(overview.allocated, currency)}</span>
        </p>
        {canManage && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-neutral-500" htmlFor="budget-target">
              {t("Manage Budget:")}
            </label>
            <input
              id="budget-target"
              type="number"
              step="0.01"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              className="w-28 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm outline-none focus:border-brand-primary"
            />
            <button
              type="button"
              disabled={savingTarget}
              onClick={handleUpdateTarget}
              className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-50"
            >
              {savingTarget && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("Update")}
            </button>
          </div>
        )}
      </div>

      {overview.categories.length === 0 ? (
        <div className="rounded-2xl bg-surface px-4 py-10 text-center text-sm text-neutral-400 shadow-sm shadow-black/5">
          {t('No categories yet -- tap "Add Category" to get started.')}
        </div>
      ) : (
        <div className="space-y-4">
          {overview.categories.map((category) => {
            const Icon = category.icon ? budgetCategoryIcon(category.icon) : null;
            return (
              <div key={category.id} className="rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${budgetCategoryColorClass(category.color)}`}>
                      {Icon && <Icon className="h-5 w-5" />}
                    </span>
                    <span className="font-medium text-neutral-900">{category.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-neutral-500">
                      {formatCurrency(category.spent, currency)} / {formatCurrency(category.monthlyLimit ?? 0, currency)}
                    </span>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(category)}
                          title={t("Edit")}
                          className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === category.id && isDeleting}
                          onClick={() => handleDelete(category)}
                          title={t("Delete")}
                          className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-brand-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className={`h-full rounded-full transition-all ${budgetProgressColorClass(category.percent, "EXPENSE")}`}
                      style={{ width: `${Math.min(100, category.percent)}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm font-medium text-neutral-500">{category.percent}%</span>
                </div>

                <Link
                  href={`/transactions?type=EXPENSE&categoryId=${encodeURIComponent(category.name)}&dateFrom=${dateFrom}&dateTo=${dateTo}`}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline"
                >
                  {t("View Transactions")}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
