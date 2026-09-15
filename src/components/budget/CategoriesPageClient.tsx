"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { BudgetCategorySummary, BudgetCategoryType, BudgetOverview } from "@/lib/api";
import { AddCategoryButton } from "./AddCategoryButton";
import { BudgetCategoryModal } from "./BudgetCategoryModal";
import { ExpenseCategoryColumn } from "./ExpenseCategoryColumn";
import { IncomeCategoryColumn } from "./IncomeCategoryColumn";

interface CategoriesPageClientProps {
  businessId: string;
  incomeOverview: BudgetOverview;
  expenseOverview: BudgetOverview;
  currency: string;
  canManage: boolean;
  // Set when arriving from AddTransactionModal's "add one under ... Categories"
  // empty-state link (?addType=INCOME|EXPENSE) -- auto-opens the Add Category
  // modal pre-set to that type instead of landing on a plain list.
  initialAddType: BudgetCategoryType | null;
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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Half-open [monthStart, monthEnd) in the backend's own aggregation vs. the
// inclusive dateFrom/dateTo the Transactions page's filters expect -- monthEnd
// here is the month's LAST day, not the 1st of the next month.
function monthDateRange(year: number, month: number): { dateFrom: string; dateTo: string } {
  const lastDay = new Date(year, month, 0).getDate();
  return { dateFrom: `${year}-${pad2(month)}-01`, dateTo: `${year}-${pad2(month)}-${pad2(lastDay)}` };
}

type CategoryModalState = "closed" | { mode: "create"; type: BudgetCategoryType } | BudgetCategorySummary;

// Merged "Income Category" + "Expense Category" page (route /categories) --
// both used to be separate sidebar items/pages with near-identical
// page.tsx wiring, differing only in which BudgetCategoryType they fetched.
// This shell owns everything shared (header, one month navigator, the single
// "Add Category" control, the one BudgetCategoryModal instance) and lays the
// two category lists out side-by-side via IncomeCategoryColumn/
// ExpenseCategoryColumn, which keep their own distinct rendering (Expense
// has per-category limits + a progress bar + a total-budget target editor;
// Income has neither -- see BudgetCategory.monthlyLimit's schema comment).
export function CategoriesPageClient({ businessId, incomeOverview, expenseOverview, currency, canManage, initialAddType }: CategoriesPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categoryModal, setCategoryModal] = useState<CategoryModalState>("closed");
  const [consumedAddType, setConsumedAddType] = useState(false);

  // Render-time state adjustment (same pattern as BudgetCategoryModal's own
  // prevKey/key reset) -- runs once on the render where initialAddType first
  // shows up, and never again, since consumedAddType then stays true across
  // later re-renders of this same component instance (e.g. a month change).
  if (initialAddType && !consumedAddType) {
    setConsumedAddType(true);
    setCategoryModal({ mode: "create", type: initialAddType });
  }

  const modalOpen = categoryModal !== "closed";
  const modalType: BudgetCategoryType = categoryModal === "closed" ? "EXPENSE" : categoryModal.type;
  const editingCategory: BudgetCategorySummary | null = categoryModal === "closed" || "mode" in categoryModal ? null : categoryModal;

  function goToMonth(month: number, year: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("month", String(month));
    next.set("year", String(year));
    router.push(`/categories?${next.toString()}`);
  }

  function changeMonth(delta: number) {
    const d = new Date(incomeOverview.year, incomeOverview.month - 1 + delta, 1);
    goToMonth(d.getMonth() + 1, d.getFullYear());
  }

  const { dateFrom, dateTo } = monthDateRange(incomeOverview.year, incomeOverview.month);

  return (
    <div className="h-full bg-brand-content px-6 py-8 pb-24 md:pb-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Budget Planning</h1>
          <p className="mt-1 text-sm text-neutral-500">Organize your income sources and set spending limits, side by side.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-surface px-1 py-1">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
              className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-1 text-sm font-medium text-neutral-700">
              {MONTH_NAMES[incomeOverview.month - 1]} {incomeOverview.year}
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
              className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {canManage && <AddCategoryButton onChoose={(type) => setCategoryModal({ mode: "create", type })} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <IncomeCategoryColumn
          businessId={businessId}
          overview={incomeOverview}
          currency={currency}
          canManage={canManage}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onEdit={(category) => setCategoryModal(category)}
        />
        <ExpenseCategoryColumn
          businessId={businessId}
          overview={expenseOverview}
          currency={currency}
          canManage={canManage}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onEdit={(category) => setCategoryModal(category)}
        />
      </div>

      <BudgetCategoryModal
        open={modalOpen}
        onClose={() => setCategoryModal("closed")}
        businessId={businessId}
        type={modalType}
        editingCategory={editingCategory}
        currency={currency}
      />
    </div>
  );
}
