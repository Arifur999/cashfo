"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { IncomeGoalSummary } from "@/lib/api";
import { deleteIncomeGoalAction } from "@/lib/budgetActions";
import { budgetProgressColorClass } from "@/lib/budgetCategoryVisuals";
import { formatCurrency } from "@/lib/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { IncomeGoalModal } from "./IncomeGoalModal";

interface MonthlyIncomeGoalPageClientProps {
  businessId: string;
  goals: IncomeGoalSummary[];
  currency: string;
  canManage: boolean;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// The one overall income goal, but as a HISTORY -- one row per month/year,
// each editable/deletable, rather than a single standing value. Deliberately
// separate from Income Category (/income-planning), which lists categories
// with no goal of their own -- see BudgetCategory.monthlyLimit's schema
// comment for why the two are split.
export function MonthlyIncomeGoalPageClient({ businessId, goals, currency, canManage }: MonthlyIncomeGoalPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [goalModal, setGoalModal] = useState<"closed" | "create" | IncomeGoalSummary>("closed");

  function handleDelete(goal: IncomeGoalSummary) {
    const confirmMessage = t("Delete the goal for {month} {year}?")
      .replace("{month}", t(MONTH_NAMES[goal.month - 1]))
      .replace("{year}", String(goal.year));
    if (!window.confirm(confirmMessage)) return;
    setDeletingId(goal.id);
    startDeleteTransition(async () => {
      const result = await deleteIncomeGoalAction(businessId, goal.id);
      if (result.success) {
        toast.success(t("Income goal deleted"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to delete the income goal"));
      }
      setDeletingId(null);
    });
  }

  return (
    <div className="h-full bg-brand-content px-6 py-8 pb-24 md:pb-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("Monthly Income Goal")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("Set an income target for any month and track how it's tracking against real income.")}</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setGoalModal("create")}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover"
          >
            <Plus className="h-4 w-4" /> {t("Add Goal")}
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl bg-surface shadow-sm shadow-black/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">{t("Month")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("Goal")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("Earned")}</th>
              <th className="px-4 py-3 font-medium">{t("Progress")}</th>
              <th className="px-4 py-3 font-medium">{t("Notes")}</th>
              {canManage && <th className="px-4 py-3 font-medium">&nbsp;</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {goals.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 7 : 6} className="px-4 py-10 text-center text-sm text-neutral-400">
                  {t('No goals set yet -- tap "Add Goal" to get started.')}
                </td>
              </tr>
            ) : (
              goals.map((goal, index) => (
                <tr key={goal.id}>
                  <td className="px-4 py-3 text-neutral-400">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-neutral-800">
                    {t(MONTH_NAMES[goal.month - 1])} {goal.year}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-700">{formatCurrency(goal.amount, currency)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-700">{formatCurrency(goal.earned, currency)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-48 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className={`h-full rounded-full transition-all ${budgetProgressColorClass(goal.percent, "INCOME")}`}
                          style={{ width: `${Math.min(100, goal.percent)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-neutral-500">{goal.percent}%</span>
                    </div>
                  </td>
                  <td className="max-w-[16rem] truncate px-4 py-3 text-neutral-400">{goal.notes ?? "—"}</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setGoalModal(goal)}
                          title={t("Edit")}
                          className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === goal.id && isDeleting}
                          onClick={() => handleDelete(goal)}
                          title={t("Delete")}
                          className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-brand-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <IncomeGoalModal
        open={goalModal !== "closed"}
        onClose={() => setGoalModal("closed")}
        businessId={businessId}
        editingGoal={goalModal === "create" || goalModal === "closed" ? null : goalModal}
        currency={currency}
      />
    </div>
  );
}
