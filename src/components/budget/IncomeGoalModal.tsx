"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { IncomeGoalSummary } from "@/lib/api";
import { createIncomeGoalAction, updateIncomeGoalAction } from "@/lib/budgetActions";
import { currencySymbol } from "@/lib/currency";

interface IncomeGoalModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  editingGoal: IncomeGoalSummary | null;
  currency: string;
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

// Wide range around whichever year it actually is right now (not a fixed
// calendar year), so this never runs out going forward -- 10 years back for
// old records, 30 years ahead for long-term planning. A plain <select>
// scrolls fine with this many options; no need for a fancier picker just to
// fix "the list stops in a few years."
function yearOptions(): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: 41 }, (_, i) => current - 10 + i);
}

export function IncomeGoalModal({ open, onClose, businessId, editingGoal, currency }: IncomeGoalModalProps) {
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  // Reset/populate the instant the modal transitions closed -> open, or
  // switches from editing one goal to another -- same render-time
  // state-adjustment pattern as BudgetCategoryModal.
  const [prevKey, setPrevKey] = useState<string>("closed");
  const key = open ? (editingGoal?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      if (editingGoal) {
        setMonth(editingGoal.month);
        setYear(editingGoal.year);
        setAmount(editingGoal.amount);
        setNotes(editingGoal.notes ?? "");
      } else {
        setMonth(now.getMonth() + 1);
        setYear(now.getFullYear());
        setAmount("");
        setNotes("");
      }
    }
  }

  function handleSubmit() {
    const parsedAmount = Number(amount);
    if (!(parsedAmount > 0)) {
      toast.error("Enter a goal amount greater than zero");
      return;
    }

    startTransition(async () => {
      const input = { month, year, amount: parsedAmount, notes: notes.trim() || undefined };
      const result = editingGoal ? await updateIncomeGoalAction(businessId, editingGoal.id, input) : await createIncomeGoalAction(businessId, input);

      if (result.success) {
        toast.success(editingGoal ? "Income goal updated" : "Income goal added");
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to save the income goal");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={editingGoal ? "Edit Income Goal" : "Add Income Goal"}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
            >
              {yearOptions().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Income Goal Amount</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-400">
              {currencySymbol(currency)}
            </span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
              className="w-full rounded-xl border border-neutral-200 py-2.5 pl-8 pr-3 text-sm font-semibold tabular-nums outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Notes <span className="text-neutral-400">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Add any additional details..."
            className="w-full resize-none rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleSubmit}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {editingGoal ? "Save Changes" : "Add Goal"}
        </button>
      </div>
    </Modal>
  );
}
