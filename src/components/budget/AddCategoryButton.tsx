"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BudgetCategoryType } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface AddCategoryButtonProps {
  onChoose: (type: BudgetCategoryType) => void;
}

// Same self-contained outside-click-to-close popover pattern as
// GoalActionsMenu -- "+ Add Category" no longer opens a form directly since
// the merged /categories page needs to know Income or Expense first.
export function AddCategoryButton({ onChoose }: AddCategoryButtonProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function choose(type: BudgetCategoryType) {
    setOpen(false);
    onChoose(type);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover"
      >
        <Plus className="h-4 w-4" /> {t("Add Category")}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-neutral-100 bg-surface py-1 shadow-xl shadow-black/10">
          <button type="button" onClick={() => choose("INCOME")} className="block w-full px-3.5 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50">
            {t("Income Category")}
          </button>
          <button type="button" onClick={() => choose("EXPENSE")} className="block w-full px-3.5 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50">
            {t("Expense Category")}
          </button>
        </div>
      )}
    </div>
  );
}
