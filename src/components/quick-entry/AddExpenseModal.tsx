"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { Account } from "@/lib/api";
import { EXPENSE_CATEGORIES } from "@/lib/quickEntryCategories";
import { createExpenseAction, getExpenseAccountsAction, getMoneyAccountsAction } from "@/lib/quickEntryActions";

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
}

export function AddExpenseModal({ open, onClose, businessId }: AddExpenseModalProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [moneyAccounts, setMoneyAccounts] = useState<Account[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAmount("");
      setFromAccountId("");
      setDate(new Date().toISOString().slice(0, 10));
      setCategory(EXPENSE_CATEGORIES[0]);
      setDescription("");
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    Promise.all([getMoneyAccountsAction(businessId), getExpenseAccountsAction(businessId)]).then(([money, expense]) => {
      setMoneyAccounts(money);
      setExpenseAccounts(expense);
      setFromAccountId((current) => current || money[0]?.id || "");
      setLoading(false);
    });
  }, [open, businessId]);

  function handleSubmit() {
    // The category picker (a plain hardcoded label, see quickEntryCategories.ts)
    // is matched against the workspace's real expense accounts by name where
    // possible so the posting lands somewhere sensible; falling back to the
    // first expense account keeps this a one-field-fewer form for the common
    // case rather than making users pick both a category label AND an
    // account every time.
    const matchingAccount = expenseAccounts.find((a) => a.name.toLowerCase().includes(category.toLowerCase())) ?? expenseAccounts[0];

    startTransition(async () => {
      if (!matchingAccount) {
        toast.error("No expense account exists in this workspace");
        return;
      }
      const result = await createExpenseAction(businessId, {
        fromAccountId,
        expenseAccountId: matchingAccount.id,
        amount: Number(amount),
        date,
        description: description || undefined,
        categoryId: category,
      });
      if (result.success) {
        toast.success("Expense added");
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to add expense");
      }
    });
  }

  const isValid = Number(amount) > 0 && fromAccountId.length > 0;

  return (
    <Modal open={open} onClose={onClose} title="Add Expense">
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
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-2xl font-semibold tabular-nums text-brand-danger outline-none focus:border-brand-danger focus:ring-2 focus:ring-brand-danger/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Paid from?</label>
          <select
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-danger disabled:bg-neutral-50"
          >
            {moneyAccounts.map((a) => (
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
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-danger"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-danger"
            >
              {EXPENSE_CATEGORIES.map((c) => (
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
            placeholder="e.g. Lunch with client"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-danger focus:ring-2 focus:ring-brand-danger/20"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!isValid || isPending}
        onClick={handleSubmit}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-danger px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-danger-hover disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save
      </button>
    </Modal>
  );
}
