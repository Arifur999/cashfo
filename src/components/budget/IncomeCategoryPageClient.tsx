"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { BudgetCategorySummary, BudgetOverview } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { BudgetCategoryModal } from "./BudgetCategoryModal";
import { IncomeCategoryColumn } from "./IncomeCategoryColumn";

interface IncomeCategoryPageClientProps {
  businessId: string;
  overview: BudgetOverview;
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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function monthDateRange(year: number, month: number): { dateFrom: string; dateTo: string } {
  const lastDay = new Date(year, month, 0).getDate();
  return { dateFrom: `${year}-${pad2(month)}-01`, dateTo: `${year}-${pad2(month)}-${pad2(lastDay)}` };
}

type CategoryModalState = "closed" | "create" | BudgetCategorySummary;

// Standalone single-column counterpart to CategoriesPageClient's
// IncomeCategoryColumn half -- same header/month-nav/modal shell, but
// always type INCOME so "Add Category" skips the Income/Expense picker
// AddCategoryButton normally shows.
export function IncomeCategoryPageClient({ businessId, overview, currency, canManage }: IncomeCategoryPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categoryModal, setCategoryModal] = useState<CategoryModalState>("closed");

  const modalOpen = categoryModal !== "closed";
  const editingCategory: BudgetCategorySummary | null = categoryModal === "closed" || categoryModal === "create" ? null : categoryModal;

  function goToMonth(month: number, year: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("month", String(month));
    next.set("year", String(year));
    router.push(`/income-category?${next.toString()}`);
  }

  function changeMonth(delta: number) {
    const d = new Date(overview.year, overview.month - 1 + delta, 1);
    goToMonth(d.getMonth() + 1, d.getFullYear());
  }

  const { dateFrom, dateTo } = monthDateRange(overview.year, overview.month);

  return (
    <div className="h-full bg-brand-content px-6 py-8 pb-24 md:pb-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("Income Category")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("Organize your income sources.")}</p>
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
              {t(MONTH_NAMES[overview.month - 1])} {overview.year}
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
          {canManage && (
            <button
              type="button"
              onClick={() => setCategoryModal("create")}
              className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover"
            >
              <Plus className="h-4 w-4" /> {t("Add Category")}
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl">
        <IncomeCategoryColumn
          businessId={businessId}
          overview={overview}
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
        type="INCOME"
        editingCategory={editingCategory}
        currency={currency}
      />
    </div>
  );
}
