"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { BudgetCategorySummary, BudgetCategoryType } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { createBudgetCategoryAction, updateBudgetCategoryAction } from "@/lib/budgetActions";
import {
  budgetCategoryColorClass,
  budgetCategoryIcon,
  budgetCategoryIconLabel,
  suggestIconForCategoryName,
  BUDGET_CATEGORY_COLORS,
  BUDGET_CATEGORY_ICONS,
} from "@/lib/budgetCategoryVisuals";
import { currencySymbol } from "@/lib/currency";

interface BudgetCategoryModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  type: BudgetCategoryType;
  editingCategory: BudgetCategorySummary | null;
  currency: string;
}

// Income figures (a Salary category, say) run far larger than a typical
// expense limit -- different slider scale per type rather than one range
// that's either too coarse for rent/groceries or too cramped for a salary.
const SLIDER_RANGE: Record<BudgetCategoryType, { min: number; max: number; step: number }> = {
  EXPENSE: { min: 50, max: 2000, step: 10 },
  INCOME: { min: 500, max: 100_000, step: 500 },
};

export function BudgetCategoryModal({ open, onClose, businessId, type, editingCategory, currency }: BudgetCategoryModalProps) {
  const { t } = useLocale();
  const isIncome = type === "INCOME";
  const { min: sliderMin, max: sliderMax, step: sliderStep } = SLIDER_RANGE[type];
  const router = useRouter();
  const [name, setName] = useState("");
  // null = no icon chosen yet -- nothing pre-selected, so saving without
  // ever clicking one in the grid genuinely stores no icon (just the
  // colored circle), instead of a silent default the user never picked.
  const [icon, setIcon] = useState<(typeof BUDGET_CATEGORY_ICONS)[number] | null>(null);
  const [color, setColor] = useState<(typeof BUDGET_CATEGORY_COLORS)[number]>(BUDGET_CATEGORY_COLORS[0]);
  const [monthlyLimit, setMonthlyLimit] = useState(String(sliderMin * 5));
  const [iconSearch, setIconSearch] = useState("");
  // Tracks whether the user has manually picked an icon in THIS open/edit
  // session -- once true, typing in the Name field never overrides their
  // choice. Starts true when editing an existing category (it already has a
  // real, saved icon; renaming it shouldn't silently swap the icon too).
  const [iconTouched, setIconTouched] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Reset/populate the instant the modal transitions closed -> open, or
  // switches from editing one category to another -- same render-time
  // state-adjustment pattern as AccountFormModal.
  const [prevKey, setPrevKey] = useState<string>("closed");
  const key = open ? (editingCategory?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      if (editingCategory) {
        setName(editingCategory.name);
        setIcon(editingCategory.icon as (typeof BUDGET_CATEGORY_ICONS)[number] | null);
        setColor(editingCategory.color as (typeof BUDGET_CATEGORY_COLORS)[number]);
        setMonthlyLimit(editingCategory.monthlyLimit ?? String(sliderMin * 5));
        setIconTouched(editingCategory.icon != null);
      } else {
        setName("");
        setIcon(null);
        setColor(BUDGET_CATEGORY_COLORS[0]);
        setMonthlyLimit(String(sliderMin * 5));
        setIconTouched(false);
      }
      setIconSearch("");
    }
  }

  // Auto-suggest an icon for well-known Income Planning category names
  // (Salary, Commission, Rental Income, ...) as the user types, same
  // "helpful default, never fights a deliberate choice" rule as above.
  function handleNameChange(next: string) {
    setName(next);
    if (isIncome && !iconTouched) {
      const suggested = suggestIconForCategoryName(next);
      if (suggested) setIcon(suggested);
    }
  }

  function handleIconClick(next: (typeof BUDGET_CATEGORY_ICONS)[number]) {
    setIcon(next);
    setIconTouched(true);
  }

  function handleSubmit() {
    const limit = Number(monthlyLimit);
    if (!name.trim()) {
      toast.error(t("Give this category a name"));
      return;
    }
    // Income categories have no per-category goal at all -- see
    // BudgetCategory.monthlyLimit's schema comment -- so this validation
    // (and sending the field at all) only applies to Expense.
    if (!isIncome && !(limit > 0)) {
      toast.error(t("Enter a limit greater than zero"));
      return;
    }

    startTransition(async () => {
      const result = editingCategory
        ? await updateBudgetCategoryAction(businessId, editingCategory.id, { name: name.trim(), icon, color, ...(!isIncome && { monthlyLimit: limit }) })
        : await createBudgetCategoryAction(businessId, { type, name: name.trim(), icon, color, ...(!isIncome && { monthlyLimit: limit }) });

      if (result.success) {
        toast.success(editingCategory ? t("Category updated") : t("Category added"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to save category"));
      }
    });
  }

  const sliderValue = Math.min(sliderMax, Math.max(sliderMin, Number(monthlyLimit) || sliderMin));

  // Substring match against the friendly label (what a search for "bonus"
  // should find, e.g. Trophy's "Trophy / Incentive" label) and the raw key
  // itself, case-insensitive. A search with no real match shows the "No
  // matching icon" empty state, not a leftover previous selection -- the
  // already-chosen `icon` value itself is untouched either way, it just
  // isn't visible in the grid until the search matches something again.
  const query = iconSearch.trim().toLowerCase();
  const filteredIcons = query
    ? BUDGET_CATEGORY_ICONS.filter((key) => key.includes(query) || budgetCategoryIconLabel(key).toLowerCase().includes(query))
    : BUDGET_CATEGORY_ICONS;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        editingCategory
          ? isIncome
            ? t("Edit Income Category")
            : t("Edit Expense Category")
          : isIncome
            ? t("Add Income Category")
            : t("Add Expense Category")
      }
    >
      <p className="-mt-2 mb-4 text-sm text-neutral-500">
        {isIncome
          ? t("Create a category to organize your income -- the overall Monthly income goal is set separately")
          : t("Create a category with its own monthly spending limit")}
      </p>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Category Name")}</label>
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={isIncome ? t("e.g., Salary, Commission, Rental Income") : t("e.g., Groceries, Gas, Subscriptions")}
            autoFocus
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">{t("Choose an Icon")}</label>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              placeholder={t("Search icons...")}
              className="w-full rounded-xl border border-neutral-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div className="grid max-h-56 grid-cols-6 gap-2 overflow-y-auto pr-1">
            {filteredIcons.length === 0 ? (
              <p className="col-span-6 py-4 text-center text-sm text-neutral-400">{t("No matching icon")}</p>
            ) : (
              filteredIcons.map((key) => {
                const Icon = budgetCategoryIcon(key);
                const label = budgetCategoryIconLabel(key);
                const selected = icon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleIconClick(key)}
                    title={label}
                    aria-label={label}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                      selected ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">{t("Choose a Color")}</label>
          <div className="grid grid-cols-4 gap-2">
            {BUDGET_CATEGORY_COLORS.map((key) => {
              const selected = color === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setColor(key)}
                  className={`rounded-xl px-3 py-2 text-sm font-medium text-white capitalize transition-shadow ${budgetCategoryColorClass(key)} ${
                    selected ? "ring-2 ring-offset-2 ring-neutral-900" : ""
                  }`}
                >
                  {key}
                </button>
              );
            })}
          </div>
        </div>

        {!isIncome && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-700">{t("Monthly Budget Limit")}</label>
              <span className="text-sm font-semibold text-neutral-900">
                {currencySymbol(currency)}
                {monthlyLimit || "0"}
              </span>
            </div>
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={sliderStep}
              value={sliderValue}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              className="w-full accent-brand-primary"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-neutral-400">
              <span>
                {currencySymbol(currency)}
                {sliderMin}
              </span>
              <input
                type="number"
                step="0.01"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                className="w-24 rounded-lg border border-neutral-200 px-2 py-1 text-right text-sm text-neutral-700 outline-none focus:border-brand-primary"
              />
              <span>
                {currencySymbol(currency)}
                {sliderMax}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          {t("Cancel")}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleSubmit}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {editingCategory ? t("Save Changes") : t("Add Category")}
        </button>
      </div>
    </Modal>
  );
}
