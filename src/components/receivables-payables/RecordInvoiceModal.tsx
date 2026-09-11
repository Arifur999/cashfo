"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { recordPurchaseAction, recordSaleAction } from "@/lib/receivablesPayablesActions";

interface RecordInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  contactId: string;
  direction: "RECEIVABLE" | "PAYABLE";
}

export function RecordInvoiceModal({ open, onClose, businessId, contactId, direction }: RecordInvoiceModalProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  // Render-time state-adjustment pattern, same convention used throughout
  // this app's modals.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAmount("");
      setDate(new Date().toISOString().slice(0, 10));
      setDueDate("");
      setDescription("");
    }
  }

  const title = direction === "RECEIVABLE" ? "Record Sale on Credit" : "Record Purchase on Credit";
  const amountLabel = direction === "RECEIVABLE" ? "Amount they owe you" : "Amount you owe them";

  function handleSubmit() {
    startTransition(async () => {
      const input = {
        contactId,
        amount: Number(amount),
        date,
        dueDate: dueDate || undefined,
        description: description || undefined,
      };
      const result = direction === "RECEIVABLE" ? await recordSaleAction(businessId, input) : await recordPurchaseAction(businessId, input);

      if (result.success) {
        toast.success(direction === "RECEIVABLE" ? "Credit sale recorded" : "Credit purchase recorded");
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to record");
      }
    });
  }

  const isValid = Number(amount) > 0;

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{amountLabel}</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-2xl font-semibold tabular-nums text-neutral-900 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
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
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Due Date <span className="text-neutral-400">(optional)</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Description <span className="text-neutral-400">(optional)</span>
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Invoice #102"
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
