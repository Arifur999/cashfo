"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/DatePicker";
import { Modal } from "@/components/ui/Modal";
import type { SavingsGoal, SavingsReminderChannel } from "@/lib/api";
import { formatDurationUntil, monthsBetween } from "@/lib/date";
import { createSavingsGoalAction, updateSavingsGoalAction } from "@/lib/savingsGoalActions";

interface SavingsGoalFormModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  editingGoal: SavingsGoal | null;
}

const CHANNEL_OPTIONS: { value: SavingsReminderChannel; label: string }[] = [
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone (SMS)" },
];

export function SavingsGoalFormModal({ open, onClose, businessId, editingGoal }: SavingsGoalFormModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderChannel, setReminderChannel] = useState<SavingsReminderChannel | "">("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  // Render-time state-adjustment reset, same convention as every other
  // modal in this app (ContactFormModal, AccountFormModal, etc.).
  const [prevKey, setPrevKey] = useState<string>("closed");
  const key = open ? (editingGoal?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      if (editingGoal) {
        setName(editingGoal.name);
        setTargetAmount(editingGoal.targetAmount);
        setTargetDate(editingGoal.targetDate.slice(0, 10));
        setReminderDate(editingGoal.reminderDate?.slice(0, 10) ?? "");
        setReminderChannel(editingGoal.reminderChannel ?? "");
        setDescription(editingGoal.description ?? "");
      } else {
        setName("");
        setTargetAmount("");
        setTargetDate(new Date().toISOString().slice(0, 10));
        setReminderDate("");
        setReminderChannel("");
        setDescription("");
      }
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      const input = {
        name,
        targetAmount: Number(targetAmount),
        targetDate,
        // Auto-derived from Target End Date (relative to today) rather than
        // asked for directly -- see monthsBetween()'s comment.
        durationMonths: monthsBetween(new Date(), new Date(targetDate)),
        reminderDate: reminderDate || undefined,
        reminderChannel: reminderChannel || undefined,
        description: description || undefined,
      };

      const result = editingGoal
        ? await updateSavingsGoalAction(businessId, editingGoal.id, input)
        : await createSavingsGoalAction(businessId, input);

      if (result.success) {
        toast.success(editingGoal ? "Goal updated" : "Goal created");
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to save goal");
      }
    });
  }

  const isValid = name.trim().length > 0 && Number(targetAmount) > 0 && targetDate.length > 0;
  const durationPreview = targetDate ? formatDurationUntil(new Date(targetDate)) : "";

  return (
    <Modal open={open} onClose={onClose} title={editingGoal ? "Edit Goal" : "Add Savings Goal"}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Goal Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Vacation Fund, Emergency Fund"
            autoFocus
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Target Amount</label>
          <input
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            type="number"
            step="0.01"
            min={0}
            placeholder="0.00"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Target End Date</label>
          <DatePicker value={targetDate} onChange={setTargetDate} />
          {durationPreview && (
            <p className="mt-1 text-xs text-neutral-400">{durationPreview.startsWith("today") ? durationPreview : `${durationPreview} away`}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Reminder Date <span className="text-neutral-400">(optional)</span>
          </label>
          <DatePicker value={reminderDate} onChange={setReminderDate} />
          {reminderDate && (
            <div className="mt-2 flex gap-2 rounded-xl bg-neutral-50 p-1">
              {CHANNEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setReminderChannel(opt.value)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    reminderChannel === opt.value
                      ? "bg-surface text-brand-primary shadow-sm ring-2 ring-brand-primary"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-neutral-400">
            Saved for later -- this app doesn&apos;t send real email/SMS reminders yet.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Description <span className="text-neutral-400">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Add details about your savings goal..."
            className="w-full resize-none rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
          Cancel
        </button>
        <button
          type="button"
          disabled={!isValid || isPending}
          onClick={handleSubmit}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {editingGoal ? "Save Changes" : "Save"}
        </button>
      </div>
    </Modal>
  );
}
