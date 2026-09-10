"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { Account } from "@/lib/api";
import { INCOME_CATEGORIES } from "@/lib/quickEntryCategories";
import { createIncomeAction, getMoneyAccountsAction } from "@/lib/quickEntryActions";

interface AddIncomeModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
}

export function AddIncomeModal({ open, onClose, businessId }: AddIncomeModalProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(INCOME_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Reset the instant the modal transitions closed -> open (render-time
  // state adjustment, same pattern as CreateWorkspaceModal).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAmount("");
      setToAccountId("");
      setDate(new Date().toISOString().slice(0, 10));
      setCategory(INCOME_CATEGORIES[0]);
      setDescription("");
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    getMoneyAccountsAction(businessId).then((data) => {
      setAccounts(data);
      setToAccountId((current) => current || data[0]?.id || "");
      setLoading(false);
    });
  }, [open, businessId]);

  function handleSubmit() {
    startTransition(async () => {
      const result = await createIncomeAction(businessId, {
        toAccountId,
        amount: Number(amount),
        date,
        description: description || undefined,
        categoryId: category,
      });
      if (result.success) {
        toast.success("Income added");
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to add income");
      }
    });
  }

  const isValid = Number(amount) > 0 && toAccountId.length > 0;

  return (
    <Modal open={open} onClose={onClose} title="Add Income">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Amount</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-2xl font-semibold tabular-nums text-brand-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Where did it land?</label>
          <select
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary disabled:bg-neutral-50"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
            >
              {INCOME_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Description <span className="text-neutral-400">(optional)</span>
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. September salary"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!isValid || isPending}
        onClick={handleSubmit}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save
      </button>
    </Modal>
  );
}
