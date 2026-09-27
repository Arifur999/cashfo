"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type TransitionStartFunction } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { clearSkillGoalAction, setSkillGoalAction } from "@/lib/skillActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { SKILL_CTA, SKILL_OUTLINE_BTN } from "./skillTheme";

const PRESETS = [3, 5, 10, 12];

interface SkillGoalModalProps {
  open: boolean;
  onClose: () => void;
  year: number;
  current: number | null; // this year's goal, if one is set
}

// "How many skills do you want to complete this year?"
export function SkillGoalModal({ open, onClose, year, current }: SkillGoalModalProps) {
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    if (!isPending) onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={`${t("Skills goal")} · ${year}`}>
      <GoalForm current={current} onClose={handleClose} isPending={isPending} startTransition={startTransition} />
    </Modal>
  );
}

function GoalForm({ current, onClose, isPending, startTransition }: { current: number | null; onClose: () => void; isPending: boolean; startTransition: TransitionStartFunction }) {
  const router = useRouter();
  const { t } = useLocale();
  const inputId = useId();
  const [text, setText] = useState(String(current ?? 5));
  const target = Number(text);
  const valid = /^\d+$/.test(text) && target >= 1 && target <= 1000;

  function run(action: () => ReturnType<typeof setSkillGoalAction>, successMessage: string) {
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
        if (valid) run(() => setSkillGoalAction(target), "Goal saved");
      }}
    >
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-neutral-700">
        {t("Skills to complete this year")}
      </label>
      <input
        id={inputId}
        value={text}
        onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        autoFocus
        aria-invalid={text !== "" && !valid}
        aria-describedby={text !== "" && !valid ? `${inputId}-error` : undefined}
        className="w-28 rounded-xl border border-neutral-200 px-3.5 py-2.5 text-center text-lg font-semibold tabular-nums outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 aria-[invalid=true]:border-red-400"
      />
      {text !== "" && !valid && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red-500">
          {t("Enter a number from 1 to 1000.")}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((n) => (
          <button key={n} type="button" onClick={() => setText(String(n))} className={`${SKILL_OUTLINE_BTN} tabular-nums`}>
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
              onClick={() => run(clearSkillGoalAction, "Goal removed")}
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
          <button type="submit" disabled={!valid || isPending} className={SKILL_CTA}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Save")}
          </button>
        </div>
      </div>
    </form>
  );
}
