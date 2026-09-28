"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { createTodoListAction } from "@/lib/todosActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface CreateTodoListModalProps {
  open: boolean;
  onClose: () => void;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// Pick a date -- the list is created empty and opened straight away, same as
// Ramadan's "Create Ramadan" flow. Only one list per date (the server
// enforces it too), so an existing date just gets a 409 toast.
export function CreateTodoListModal({ open, onClose }: CreateTodoListModalProps) {
  const router = useRouter();
  const { t } = useLocale();
  const dateId = useId();
  const [date, setDate] = useState(todayKey());
  const [isPending, startTransition] = useTransition();

  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDate(todayKey());
  }

  const isValid = /^\d{4}-\d{2}-\d{2}$/.test(date);

  function handleSubmit() {
    if (!isValid) return;
    startTransition(async () => {
      const result = await createTodoListAction(date);
      if (result.success && result.data) {
        toast.success(t("List created"));
        onClose();
        router.push(`/habit-tracker/todos/${result.data.id}`);
      } else {
        toast.error(result.message ?? t("Failed to create list"));
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={t("Add List")}>
      <div>
        <label htmlFor={dateId} className="mb-1 block text-sm font-medium text-neutral-700">
          {t("Date")}
        </label>
        <input
          id={dateId}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          autoFocus
          className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        />
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
          {t("Create")}
        </button>
      </div>
    </Modal>
  );
}
