"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type TransitionStartFunction } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { clearBookGoalAction, setBookGoalAction } from "@/lib/bookActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { BOOK_CTA } from "./bookTheme";

const PRESETS = [6, 12, 24, 52];

interface GoalModalProps {
  open: boolean;
  onClose: () => void;
  year: number;
  current: number | null; // this year's goal, if one is set
}

// "How many books do you want to finish this year?"
export function GoalModal({ open, onClose, year, current }: GoalModalProps) {
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    if (!isPending) onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={`${t("Reading goal")} · ${year}`}>
      <GoalForm current={current} onClose={handleClose} isPending={isPending} startTransition={startTransition} />
    </Modal>
  );
}

function GoalForm({ current, onClose, isPending, startTransition }: { current: number | null; onClose: () => void; isPending: boolean; startTransition: TransitionStartFunction }) {
  const router = useRouter();
  const { t } = useLocale();
  const inputId = useId();
  const [text, setText] = useState(String(current ?? 12));
  const target = Number(text);
  const valid = /^\d+$/.test(text) && target >= 1 && target <= 1000;

  function run(action: () => ReturnType<typeof setBookGoalAction>, successMessage: string) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(t(successMessage));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to save goal"));
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) run(() => setBookGoalAction(target), "Goal saved");
      }}
    >
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-neutral-700">
        {t("Books to finish this year")}
      </label>
      <input
        id={inputId}
        value={text}
        onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        autoFocus
        aria-invalid={text !== "" && !valid}
        aria-describedby={text !== "" && !valid ? `${inputId}-error` : undefined}
        className="w-28 rounded-xl border border-neutral-200 px-3.5 py-2.5 text-center text-lg font-semibold tabular-nums outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 aria-[invalid=true]:border-red-400"
      />
      {text !== "" && !valid && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red-500">
          {t("Enter a number from 1 to 1000.")}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setText(String(n))}
            className="rounded-lg border border-amber-900/15 dark:border-amber-300/25 px-3 py-1.5 text-xs font-semibold tabular-nums text-amber-800 dark:text-amber-300 transition hover:bg-amber-600/10"
          >
            {n}
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div>
          {current !== null && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(clearBookGoalAction, "Goal removed")}
              className="rounded-xl px-3 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-100 hover:text-brand-danger disabled:opacity-50"
            >
              {t("Remove goal")}
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} disabled={isPending} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50">
            {t("Cancel")}
          </button>
          <button type="submit" disabled={!valid || isPending} className={BOOK_CTA}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Save")}
          </button>
        </div>
      </div>
    </form>
  );
}
