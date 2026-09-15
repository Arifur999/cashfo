"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/Combobox";
import { DatePicker } from "@/components/ui/DatePicker";
import { Modal } from "@/components/ui/Modal";
import type { SavingsGoal } from "@/lib/api";
import { createSavingsTransferAction } from "@/lib/savingsGoalActions";

interface SavingsTransferModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  goals: SavingsGoal[];
}

export function SavingsTransferModal({ open, onClose, businessId, goals }: SavingsTransferModalProps) {
  const router = useRouter();
  const [fromGoalId, setFromGoalId] = useState("");
  const [toGoalId, setToGoalId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const [resetCount, setResetCount] = useState(0);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setFromGoalId("");
      setToGoalId("");
      setAmount("");
      setDate(new Date().toISOString().slice(0, 10));
      setNotes("");
      setResetCount((n) => n + 1);
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createSavingsTransferAction(businessId, { fromGoalId, toGoalId, amount: Number(amount), date, notes: notes || undefined });
      if (result.success) {
        toast.success("Transferred");
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to transfer");
      }
    });
  }

  const isValid = fromGoalId.length > 0 && toGoalId.length > 0 && fromGoalId !== toGoalId && Number(amount) > 0;

  return (
    <Modal open={open} onClose={onClose} title="Savings Transfer">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">From Goal</label>
          <Combobox key={`from-${resetCount}`} value={fromGoalId} onChange={setFromGoalId} options={goals.map((g) => ({ value: g.id, label: g.name }))} placeholder="Search goals" emptyMessage="No goals yet" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">To Goal</label>
          <Combobox key={`to-${resetCount}`} value={toGoalId} onChange={setToGoalId} options={goals.map((g) => ({ value: g.id, label: g.name }))} placeholder="Search goals" emptyMessage="No goals yet" />
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
          <label className="mb-1 block text-sm font-medium text-neutral-700">Date</label>
          <DatePicker value={date} onChange={setDate} />
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
        <p className="text-xs text-neutral-400">Moves saved money between two goals. Your total savings stays the same.</p>
      </div>

      <button
        type="button"
        disabled={!isValid || isPending}
        onClick={handleSubmit}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Transfer
      </button>
    </Modal>
  );
}
