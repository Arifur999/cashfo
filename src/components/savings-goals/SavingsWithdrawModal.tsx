"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/DatePicker";
import { Modal } from "@/components/ui/Modal";
import type { Account, SavingsGoal } from "@/lib/api";
import { getBudgetCategoryNamesAction } from "@/lib/budgetActions";
import { formatCurrency } from "@/lib/currency";
import { getExpenseAccountsAction } from "@/lib/quickEntryActions";
import { getActiveSavingsWalletsAction, withdrawSavingsGoalAction } from "@/lib/savingsGoalActions";

interface SavingsWithdrawModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  goal: SavingsGoal | null;
  currency: string;
}

// Mirrors AddContributionModal, reversed: money leaves a Savings Wallet and
// becomes a real Expense instead of landing in the wallet. Always cashes out
// the goal's ENTIRE current saved amount at once -- see
// SavingsGoalsService.withdraw()'s comment -- so there's no amount field,
// just where the money comes from (which wallet) and where it's spent
// (which Expense category). expenseAccountId is auto-resolved from the
// chosen category the same fuzzy way AddTransactionModal already does for
// regular expenses -- no separate "which ledger account" field to fill in.
export function SavingsWithdrawModal({ open, onClose, businessId, goal, currency }: SavingsWithdrawModalProps) {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingsAccountId, setSavingsAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [notes, setNotes] = useState("");
  const [savingsWallets, setSavingsWallets] = useState<Account[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<{ name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDate(new Date().toISOString().slice(0, 10));
      setSavingsAccountId("");
      setCategoryId("");
      setNotes("");
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    Promise.all([getActiveSavingsWalletsAction(businessId), getExpenseAccountsAction(businessId), getBudgetCategoryNamesAction(businessId, "EXPENSE")]).then(
      ([wallets, accounts, cats]) => {
        setSavingsWallets(wallets);
        setSavingsAccountId((current) => current || wallets[0]?.id || "");
        setExpenseAccounts(accounts);
        setCategories(cats);
        setCategoryId((current) => current || cats[0]?.name || "");
        setLoading(false);
      },
    );
  }, [open, businessId]);

  const resolvedExpenseAccountId = expenseAccounts.find((a) => a.name.toLowerCase().includes(categoryId.toLowerCase()))?.id ?? expenseAccounts[0]?.id ?? "";
  const isValid = savingsAccountId.length > 0 && categoryId.length > 0 && resolvedExpenseAccountId.length > 0;

  function handleSubmit() {
    if (!goal) return;
    startTransition(async () => {
      const result = await withdrawSavingsGoalAction(businessId, goal.id, {
        date,
        savingsAccountId,
        expenseAccountId: resolvedExpenseAccountId,
        categoryId,
        notes: notes || undefined,
      });
      if (result.success) {
        toast.success("Goal withdrawn and recorded as an expense");
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to withdraw savings");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Withdraw Savings">
      <div className="space-y-4">
        {goal && (
          <p className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
            Withdrawing the full <span className="font-semibold text-neutral-900">{formatCurrency(goal.currentAmount, currency)}</span> saved for &quot;
            {goal.name}&quot;. The goal will be marked <span className="font-semibold text-neutral-900">Withdrawn</span> and this can&apos;t be undone.
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Date</label>
          <DatePicker value={date} onChange={setDate} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">From Savings Wallet</label>
          <select
            value={savingsAccountId}
            onChange={(e) => setSavingsAccountId(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary disabled:bg-neutral-50"
          >
            {savingsWallets.length === 0 && <option value="">No Savings Wallets yet</option>}
            {savingsWallets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {!loading && savingsWallets.length === 0 && (
            <p className="mt-1 text-xs text-brand-danger">
              No Savings Wallets yet --{" "}
              <Link href="/savings-goals/wallet" className="font-medium underline">
                add one
              </Link>{" "}
              first.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Spend As (Expense Category)</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary disabled:bg-neutral-50"
          >
            {categories.length === 0 && <option value="">No expense categories yet</option>}
            {categories.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          {!loading && expenseAccounts.length === 0 && (
            <p className="mt-1 text-xs text-brand-danger">No expense account exists in this workspace yet -- add one in Chart of Accounts first.</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Notes <span className="text-neutral-400">(optional)</span>
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!isValid || isPending}
        onClick={handleSubmit}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-danger px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Withdraw
      </button>
    </Modal>
  );
}
