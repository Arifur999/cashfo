"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { HabitMonthTracker } from "@/lib/customer/api";
import { formatDate } from "@/lib/customer/date";
import { hijriParts } from "@/lib/customer/habitDisplay";
import { createRamadanTrackerAction } from "@/lib/customer/habitsActions";
import { ramadanStartIn } from "@/lib/customer/ramadanDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface RamadanSetupDialogProps {
  open: boolean;
  onClose: () => void;
  existing: HabitMonthTracker[];
  // The Gregorian year to offer first.
  defaultYear: number;
}

// Set up a Ramadan sheet: the year it falls in and whether it has 29 or
// 30 days (the moon decides). The sheet starts with Roza; rows are added
// on the sheet.
export function RamadanSetupDialog({ open, onClose, existing, defaultYear }: RamadanSetupDialogProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [year, setYear] = useState(defaultYear);
  const [days, setDays] = useState<29 | 30>(30);
  const [isPending, startTransition] = useTransition();
  const years = Array.from({ length: 6 }, (_, i) => defaultYear - 2 + i).filter((y) => !existing.some((tr) => tr.year === y));

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setYear(years.includes(defaultYear) ? defaultYear : (years[0] ?? defaultYear));
      setDays(30);
    }
  }

  const start = ramadanStartIn(year);
  const hijri = start ? hijriParts(start).year : null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending || years.length === 0) return;
    startTransition(async () => {
      const result = await createRamadanTrackerAction({ year, days });
      if (result.success && result.data) {
        toast.success(`${t("Ramadan")} ${hijri ?? year} ${t("is set up")}`);
        onClose();
        router.push(`/habit-tracker/habits/ramadan/${result.data.id}`);
      } else {
        toast.error(result.message ?? t("Failed to set up Ramadan"));
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-110 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
            <AlertDialogTitle className="text-h3 text-ink">
              {t("Set up Ramadan")} {hijri ?? ""}
            </AlertDialogTitle>
            <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
          <AlertDialogDescription className="px-6 pt-4 text-small text-ink-muted">{t("A sheet of Roza for every day, with rows you add for Taraweeh, Quran and the rest.")}</AlertDialogDescription>
          <div className="flex flex-col gap-4 px-6 py-4">
            <Field htmlFor="rs-year" label={<span className="text-body font-medium text-ink">{t("The year it falls in")}</span>} hint={start ? `${t("Begins around")} ${formatDate(start, "d MMM yyyy")}, ${t("depending on the moon.")}` : undefined}>
              <NativeSelect id="rs-year" size="md" value={String(year)} onChange={(event) => setYear(Number(event.target.value))} frameClassName="w-full" disabled={years.length === 0}>
                {years.length === 0 && <option value={String(year)}>{t("Every nearby year already has a sheet")}</option>}
                {years.map((y) => (
                  <option key={y} value={String(y)}>
                    {y} · {t("Ramadan")} {hijriParts(ramadanStartIn(y) ?? `${y}-01-01`).year}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-body font-medium text-ink">{t("Number of days")}</legend>
              <div role="radiogroup" className="grid grid-cols-2 gap-2">
                {([29, 30] as const).map((option) => (
                  <button key={option} type="button" role="radio" aria-checked={days === option} onClick={() => setDays(option)} className={cn("flex h-12 items-center justify-center rounded-md border text-body-lg font-bold transition-colors", days === option ? "border-[1.5px] border-emerald bg-mint-50 text-emerald" : "border-line bg-surface text-ink-2 hover:border-line-strong")}>
                    {option} {t("days")}
                  </button>
                ))}
              </div>
              <span className="text-caption font-normal text-ink-muted">{t("Ramadan is 29 or 30 days, depending on the moon sighting.")}</span>
            </fieldset>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-line bg-cream px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={isPending || years.length === 0} className="px-5">
              {isPending && <Loader />}
              {t("Set up")}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
