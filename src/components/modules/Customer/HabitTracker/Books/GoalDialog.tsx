"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { clearBookGoalAction, setBookGoalAction } from "@/lib/customer/bookActions";
import { actionError, latinDigits } from "@/lib/customer/habitDisplay";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CloseButton, PanelFooter } from "../Tracker/PanelParts";

interface GoalDialogProps {
  open: boolean;
  onClose: () => void;
  year: number;
  // This year's goal, if one is set.
  current: number | null;
}

const PRESETS = [6, 12, 24, 52];
const MAX_GOAL = 1000;

// "How many books do you want to finish this year?" Removing the goal can
// be undone from its toast.
export function GoalDialog({ open, onClose, year, current }: GoalDialogProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [text, setText] = useState("12");
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setText(String(current ?? 12));
  }

  const target = Number(text);
  const valid = /^\d+$/.test(text) && target >= 1 && target <= MAX_GOAL;

  function run(action: () => ReturnType<typeof setBookGoalAction>, successMessage: string, undo?: () => void) {
    if (isPending) return;
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(t(successMessage), undo ? { action: { label: t("Undo"), onClick: undo } } : undefined);
        onClose();
        router.refresh();
      } else {
        toast.error(actionError(result.message, "Failed to save goal", t, locale));
      }
    });
  }

  // The goal comes back as it was.
  function restore(previous: number) {
    void setBookGoalAction(previous).then((result) => {
      if (result.success) router.refresh();
      else toast.error(actionError(result.message, "Failed to save goal", t, locale));
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (valid) run(() => setBookGoalAction(target), "Goal saved");
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-110 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
            <AlertDialogTitle className="text-h3 text-ink">{t("{year} reading goal", { year: toLocaleDigits(String(year), locale) })}</AlertDialogTitle>
            <CloseButton onClick={onClose} label={t("Close")} />
          </div>
          <AlertDialogDescription className="px-6 pt-4 text-small text-ink-muted">{t("How many books do you want to finish this year? A spine goes on the shelf for each one.")}</AlertDialogDescription>
          <div className="flex flex-col gap-4 px-6 py-4">
            <div role="group" aria-label={t("Suggested goals")} className="grid grid-cols-4 gap-2">
              {PRESETS.map((preset) => {
                const on = text === String(preset);
                return (
                  <button key={preset} type="button" aria-pressed={on} onClick={() => setText(String(preset))} className={cn("flex h-11 items-center justify-center rounded-md border text-body font-semibold transition-colors", on ? "border-[1.5px] border-emerald bg-mint-50 text-brand-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong")}>
                    {formatCount(preset, locale)}
                  </button>
                );
              })}
            </div>
            <Field htmlFor="bk-goal" label={<span className="text-body font-medium text-ink">{t("Books to finish this year")}</span>} error={text !== "" && !valid ? t("Enter a number from 1 to 1000.") : undefined}>
              <Input id="bk-goal" size="md" inputMode="numeric" value={text} onChange={(event) => setText(latinDigits(event.target.value).replace(/\D/g, "").slice(0, 4))} invalid={text !== "" && !valid} frameClassName="w-40" />
            </Field>
          </div>
          <PanelFooter
            aside={
              current !== null && (
                <Button type="button" variant="ghost" className="text-expense hover:bg-expense-soft hover:text-expense" onClick={() => run(clearBookGoalAction, "Goal removed", () => restore(current))} disabled={isPending}>
                  {t("Remove goal")}
                </Button>
              )
            }
          >
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader />}
              {t("Save")}
            </Button>
          </PanelFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
