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
import { actionError, daysText, dayText, hijriParts } from "@/lib/customer/habitDisplay";
import { createRamadanTrackerAction } from "@/lib/customer/habitsActions";
import { ramadanStartIn, setupYears } from "@/lib/customer/ramadanDisplay";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";
import { CloseButton, PanelFooter } from "../Tracker/PanelParts";

interface RamadanSetupDialogProps {
  open: boolean;
  onClose: () => void;
  existing: HabitMonthTracker[];
  // The Gregorian year to offer first.
  defaultYear: number;
  // An earlier Ramadan (the next one has its sheet): only the years up to
  // defaultYear.
  earlier?: boolean;
}

// Set up a Ramadan sheet: the year it falls in and whether it has 29 or
// 30 days (the moon decides). The sheet starts with Roza; rows are added
// on the sheet. It opens on the nearest year still free from the one asked
// for, never one two years back; an earlier Ramadan on the latest free one.
export function RamadanSetupDialog({ open, onClose, existing, defaultYear, earlier = false }: RamadanSetupDialogProps) {
  const { t, locale } = useLocale();
  const { hijriAdjust } = usePrayerSettings().settings;
  const router = useRouter();
  const [year, setYear] = useState(defaultYear);
  const [days, setDays] = useState<29 | 30>(30);
  const [isPending, startTransition] = useTransition();
  const years = setupYears(existing, defaultYear, earlier);
  const digits = (value: number | string) => toLocaleDigits(String(value), locale);

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      const latest = years[years.length - 1];
      setYear((earlier ? latest : (years.find((y) => y >= defaultYear) ?? latest)) ?? defaultYear);
      setDays(30);
    }
  }

  const start = ramadanStartIn(year, hijriAdjust);
  const hijri = start ? hijriParts(start, hijriAdjust).year : null;
  const name = t("Ramadan {year}", { year: digits(hijri ?? year) });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending || years.length === 0) return;
    startTransition(async () => {
      const result = await createRamadanTrackerAction({ year, days });
      if (result.success && result.data) {
        toast.success(t("{name} is set up", { name }));
        onClose();
        router.push(`/habit-tracker/habits/ramadan/${result.data.id}`);
      } else {
        toast.error(actionError(result.message, "Failed to set up Ramadan", t, locale));
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-110 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
            <AlertDialogTitle className="text-h3 text-ink">{t("Set up {name}", { name })}</AlertDialogTitle>
            <CloseButton onClick={onClose} label={t("Close")} />
          </div>
          <AlertDialogDescription className="px-6 pt-4 text-small text-ink-muted">{t("A sheet of Roza for every day, with rows you add for Taraweeh, Quran and the rest.")}</AlertDialogDescription>
          <div className="flex flex-col gap-4 px-6 py-4">
            <Field htmlFor="rs-year" label={<span className="text-body font-medium text-ink">{t("The year it falls in")}</span>} hint={start ? t("Begins around {date}, depending on the moon.", { date: dayText(start, locale, "dayMonthYear") }) : undefined}>
              <NativeSelect id="rs-year" size="md" value={String(year)} onChange={(event) => setYear(Number(event.target.value))} frameClassName="w-full" disabled={years.length === 0}>
                {years.length === 0 && <option value={String(year)}>{t("Every nearby year already has a sheet")}</option>}
                {years.map((y) => (
                  <option key={y} value={String(y)}>
                    {digits(y)} · {t("Ramadan {year}", { year: digits(hijriParts(ramadanStartIn(y, hijriAdjust) ?? `${y}-01-01`, hijriAdjust).year) })}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-body leading-[normal] font-medium text-ink">{t("Number of days")}</legend>
              <div role="radiogroup" className="grid grid-cols-2 gap-2">
                {([29, 30] as const).map((option) => (
                  <button key={option} type="button" role="radio" aria-checked={days === option} onClick={() => setDays(option)} className={cn("flex h-12 items-center justify-center rounded-md border text-body-lg font-bold transition-colors", days === option ? "border-[1.5px] border-emerald bg-mint-50 text-brand-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong")}>
                    {daysText(option, t, locale)}
                  </button>
                ))}
              </div>
              <span className="text-caption font-normal text-ink-muted">{t("Ramadan is 29 or 30 days, depending on the moon sighting.")}</span>
            </fieldset>
          </div>
          <PanelFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={isPending || years.length === 0} className="px-5">
              {isPending && <Loader />}
              {t("Set up")}
            </Button>
          </PanelFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
