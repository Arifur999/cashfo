"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { HabitMonthTracker } from "@/lib/customer/api";
import { actionError } from "@/lib/customer/habitDisplay";
import { createHabitTrackerAction } from "@/lib/customer/habitsActions";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CloseButton, PanelFooter } from "../Tracker/PanelParts";

interface EarlierMonthDialogProps {
  open: boolean;
  onClose: () => void;
  existing: HabitMonthTracker[];
  // "YYYY-MM" of the current month: only earlier months can be added.
  currentMonth: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

// The current month opens on its own; an earlier month is added here, to
// fill in prayers from before the app was used.
export function EarlierMonthDialog({ open, onClose, existing, currentMonth }: EarlierMonthDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // The last 24 months before this one that have no sheet yet.
  const [year, month] = currentMonth.split("-").map(Number);
  const choices = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 2 - i, 1));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
  }).filter((key) => !existing.some((tr) => `${tr.year}-${pad(tr.month ?? 0)}` === key));
  const [choice, setChoice] = useState(choices[0] ?? "");

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setChoice(choices[0] ?? "");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!choice || isPending) return;
    const [y, m] = choice.split("-").map(Number);
    startTransition(async () => {
      const result = await createHabitTrackerAction({ category: "Namaz", month: m, year: y });
      if (result.success && result.data) {
        toast.success(t("{month} added", { month: monthName(choice, fmt, "long", true) }));
        onClose();
        router.push(`/habit-tracker/habits/namaz/${result.data.id}`);
      } else {
        toast.error(actionError(result.message, "Failed to add the month", t, fmt));
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-105 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
            <AlertDialogTitle className="text-h3 text-ink">{t("Add an earlier month")}</AlertDialogTitle>
            <CloseButton onClick={onClose} label={t("Close")} />
          </div>
          <AlertDialogDescription className="px-6 pt-4 text-small text-ink-muted">{t("This month opens on its own. Add a past month to fill in its prayers.")}</AlertDialogDescription>
          <div className="px-6 py-4">
            <Field htmlFor="em-month" label={<span className="text-body font-medium text-ink">{t("Month")}</span>}>
              <NativeSelect id="em-month" size="md" value={choice} onChange={(event) => setChoice(event.target.value)} frameClassName="w-full" disabled={choices.length === 0}>
                {choices.length === 0 && <option value="">{t("Every recent month already has a sheet")}</option>}
                {choices.map((key) => (
                  <option key={key} value={key}>
                    {monthName(key, fmt, "long", true)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <PanelFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!choice || isPending} className="px-5">
              {isPending && <Loader />}
              {t("Add month")}
            </Button>
          </PanelFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
