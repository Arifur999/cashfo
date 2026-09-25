"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createGroupMonthBudgetAction, updateGroupMonthBudgetAction } from "@/lib/groupExpensesActions";
import type { GroupMonthlyBudget } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface AddMonthBudgetModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  editingBudget?: GroupMonthlyBudget | null;
}

const MONTH_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export function AddMonthBudgetModal({ open, onClose, businessId, editingBudget = null }: AddMonthBudgetModalProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [budgetAmount, setBudgetAmount] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState<string>("closed");
  const key = open ? (editingBudget?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      if (editingBudget) {
        setMonth(editingBudget.month);
        setYear(String(editingBudget.year));
        setBudgetAmount(editingBudget.budgetAmount);
      } else {
        setMonth(new Date().getMonth() + 1);
        setYear(String(new Date().getFullYear()));
        setBudgetAmount("");
      }
    }
  }

  function handleSubmit() {
    const input = { month, year: Number(year), budgetAmount };
    startTransition(async () => {
      const result = editingBudget
        ? await updateGroupMonthBudgetAction(businessId, editingBudget.id, input)
        : await createGroupMonthBudgetAction(businessId, input);
      if (result.success) {
        toast.success(editingBudget ? t("Month budget updated") : t("Month budget added"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? (editingBudget ? t("Failed to update month budget") : t("Failed to add month budget")));
      }
    });
  }

  const isValid = /^\d{4}$/.test(year) && Number(budgetAmount) > 0;

  return (
    <Modal open={open} onClose={onClose} title={editingBudget ? t("Edit Month Budget") : t("Add Month")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Month")}</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
          >
            {MONTH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.label)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Year")}</label>
          <input
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder="2026"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Monthly Budget")}</label>
          <input
            value={budgetAmount}
            onChange={(e) => setBudgetAmount(e.target.value)}
            type="number"
            step="0.01"
            min={0}
            placeholder="0.00"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
          {t("Cancel")}
        </button>
        <button
          type="button"
          disabled={!isValid || isPending}
          onClick={handleSubmit}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {editingBudget ? t("Save Changes") : t("Add")}
        </button>
      </div>
    </Modal>
  );
}
