"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/DatePicker";
import { Modal } from "@/components/ui/Modal";
import type { Account, SavingsGoal } from "@/lib/api";
import { getMoneyAccountsAction } from "@/lib/quickEntryActions";
import { addContributionAction, getActiveSavingsWalletsAction } from "@/lib/savingsGoalActions";

interface AddContributionModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  goal: SavingsGoal | null;
}

export function AddContributionModal({ open, onClose, businessId, goal }: AddContributionModalProps) {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [moneyAccountId, setMoneyAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [savingsWallets, setSavingsWallets] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDate(new Date().toISOString().slice(0, 10));
      setMoneyAccountId("");
      setToAccountId("");
      setAmount("");
      setNotes("");
      setLoadingAccounts(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    Promise.all([getMoneyAccountsAction(businessId), getActiveSavingsWalletsAction(businessId)]).then(([money, wallets]) => {
      setAccounts(money);
      setMoneyAccountId((current) => current || money[0]?.id || "");
      setSavingsWallets(wallets);
      setToAccountId((current) => current || wallets[0]?.id || "");
      setLoadingAccounts(false);
    });
  }, [open, businessId]);

  function handleSubmit() {
    if (!goal) return;
    startTransition(async () => {
      const result = await addContributionAction(businessId, goal.id, {
        date,
        moneyAccountId,
        toAccountId,
        amount: Number(amount),
        notes: notes || undefined,
      });
      if (result.success) {
        toast.success("Contribution added");
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to add contribution");
      }
    });
  }

  const isValid = moneyAccountId.length > 0 && toAccountId.length > 0 && Number(amount) > 0;

  return (
    <Modal open={open} onClose={onClose} title="Add Contribution">
      <div className="space-y-4">
        {goal && <p className="text-sm text-neutral-500">Adding funds to &quot;{goal.name}&quot;</p>}

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Date</label>
          <DatePicker value={date} onChange={setDate} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">From Account</label>
          <select
            value={moneyAccountId}
            onChange={(e) => setMoneyAccountId(e.target.value)}
            disabled={loadingAccounts}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary disabled:bg-neutral-50"
          >
            {accounts.length === 0 && <option value="">No money accounts yet</option>}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">To Wallet</label>
          <select
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            disabled={loadingAccounts}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary disabled:bg-neutral-50"
          >
            {savingsWallets.length === 0 && <option value="">No Savings Wallets yet</option>}
            {savingsWallets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {!loadingAccounts && savingsWallets.length === 0 && (
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
          <label className="mb-1 block text-sm font-medium text-neutral-700">Amount</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            step="0.01"
            min={0}
            placeholder="0.00"
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-2xl font-semibold tabular-nums text-neutral-900 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
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
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save
      </button>
    </Modal>
  );
}
