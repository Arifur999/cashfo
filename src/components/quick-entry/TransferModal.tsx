"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { Account } from "@/lib/api";
import { createTransferAction, getMoneyAccountsAction } from "@/lib/quickEntryActions";

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
}

export function TransferModal({ open, onClose, businessId }: TransferModalProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAmount("");
      setFromAccountId("");
      setToAccountId("");
      setDate(new Date().toISOString().slice(0, 10));
      setDescription("");
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    getMoneyAccountsAction(businessId).then((data) => {
      setAccounts(data);
      setFromAccountId((current) => current || data[0]?.id || "");
      setToAccountId((current) => current || data[1]?.id || data[0]?.id || "");
      setLoading(false);
    });
  }, [open, businessId]);

  const sameAccount = fromAccountId && toAccountId && fromAccountId === toAccountId;
  const isValid = Number(amount) > 0 && fromAccountId.length > 0 && toAccountId.length > 0 && !sameAccount;

  function handleSubmit() {
    startTransition(async () => {
      const result = await createTransferAction(businessId, {
        fromAccountId,
        toAccountId,
        amount: Number(amount),
        date,
        description: description || undefined,
      });
      if (result.success) {
        toast.success("Transfer completed");
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to create transfer");
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Move Money">
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
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-2xl font-semibold tabular-nums text-neutral-800 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-neutral-700">From</label>
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-400 disabled:bg-neutral-50"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <ArrowRight className="mt-5 h-4 w-4 shrink-0 text-neutral-400" />
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-neutral-700">To</label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-400 disabled:bg-neutral-50"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {sameAccount && <p className="text-sm text-brand-danger">From and To must be different accounts</p>}

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Description <span className="text-neutral-400">(optional)</span>
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Moving savings to bank"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!isValid || isPending}
        onClick={handleSubmit}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-dark px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark-hover disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Move Money
      </button>
    </Modal>
  );
}
