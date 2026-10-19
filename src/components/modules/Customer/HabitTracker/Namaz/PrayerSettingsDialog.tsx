"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatDate, timeLabel } from "@/lib/customer/date";
import { hijriDate } from "@/lib/customer/habitDisplay";
import { updatePrayerSettingsAction } from "@/lib/customer/habitsActions";
import { type AsrSchool, CITIES, clockOf, METHODS, type PrayerSettings, prayerTimesFor } from "@/lib/customer/prayerTimes";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface PrayerSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  today: string;
}

const PREVIEW = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

// The board's prayer time settings: the city, the calculation method, the
// Asr school and the Hijri adjustment, with today's times as they would read.
export function PrayerSettingsDialog({ open, onClose, today }: PrayerSettingsDialogProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const { settings, setSettings } = usePrayerSettings();
  const [draft, setDraft] = useState<PrayerSettings>(settings);
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setDraft(settings);
  }
  const [isPending, startTransition] = useTransition();
  const times = prayerTimesFor(draft, today);
  const cities = CITIES.some((city) => city.name === draft.city) ? CITIES : [{ name: draft.city, latitude: draft.latitude, longitude: draft.longitude }, ...CITIES];

  function pickCity(name: string) {
    const city = cities.find((each) => each.name === name);
    if (city) setDraft({ ...draft, city: city.name, latitude: city.latitude, longitude: city.longitude });
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updatePrayerSettingsAction(draft);
      if (result.success && result.data) {
        setSettings(result.data);
        toast.success(t("Prayer settings saved"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to save the prayer settings"));
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-120 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0 sm:max-w-120">
        <form onSubmit={save} className="flex max-h-[90vh] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
            <div className="flex flex-col gap-0.5">
              <AlertDialogTitle className="text-h3 text-ink">{t("Prayer time settings")}</AlertDialogTitle>
              <AlertDialogDescription className="text-small text-ink-muted">{t("Used by Namaz, Ramadan and Today")}</AlertDialogDescription>
            </div>
            <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
            <Field htmlFor="ps-city" label={<span className="text-body font-medium text-ink">{t("City")}</span>} hint={t("Prayer, Sehri and Iftar times are worked out for this city.")}>
              <NativeSelect id="ps-city" size="md" value={draft.city} onChange={(event) => pickCity(event.target.value)} frameClassName="w-full">
                {cities.map((city) => (
                  <option key={city.name} value={city.name}>
                    {t(city.name)}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field htmlFor="ps-method" label={<span className="text-body font-medium text-ink">{t("Calculation method")}</span>} hint={draft.method === "Karachi" ? t("The method most mosques in Bangladesh follow.") : undefined}>
              <NativeSelect id="ps-method" size="md" value={draft.method} onChange={(event) => setDraft({ ...draft, method: event.target.value })} frameClassName="w-full">
                {METHODS.map((method) => (
                  <option key={method.key} value={method.key}>
                    {t(method.label)}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-body font-medium text-ink">{t("Asr time")}</legend>
              <SegmentedControl<AsrSchool>
                options={[
                  { value: "HANAFI", label: t("Hanafi (later)") },
                  { value: "SHAFII", label: t("Shafi'i (earlier)") },
                ]}
                value={draft.asrSchool}
                onChange={(asrSchool) => setDraft({ ...draft, asrSchool })}
                label={t("Asr time")}
                size="lg"
                className="w-full [&>button]:flex-1"
              />
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-body font-medium text-ink">{t("Hijri date")}</legend>
              <SegmentedControl<string>
                options={[
                  { value: "-1", label: t("One day earlier") },
                  { value: "0", label: t("As calculated") },
                  { value: "1", label: t("One day later") },
                ]}
                value={String(draft.hijriAdjust)}
                onChange={(value) => setDraft({ ...draft, hijriAdjust: Number(value) })}
                label={t("Hijri date")}
                size="lg"
                className="w-full [&>button]:flex-1"
              />
              <span className="text-small text-ink-muted">
                {t("The moon is often seen a day later in Bangladesh. Today shows as")} <b className="font-semibold text-ink">{hijriDate(today, locale, draft.hijriAdjust)}</b>
              </span>
            </fieldset>

            <div className="flex flex-col gap-3 rounded-md border border-line bg-cream px-4 py-3">
              <div className="grid grid-cols-5 gap-2">
                {PREVIEW.map((prayer) => (
                  <span key={prayer} className="flex flex-col items-center gap-0.5">
                    <span className="text-caption font-semibold text-ink-muted">{t(prayer)}</span>
                    <span className="text-small font-bold text-ink tabular-nums">{timeLabel(clockOf(times[prayer]), t)}</span>
                  </span>
                ))}
              </div>
              <span className="flex items-center gap-2 text-caption text-ink-muted">
                <Check className="size-3.5 text-emerald" aria-hidden="true" />
                {t("Preview for {date} with these settings.", { date: formatDate(`${today}T00:00:00.000Z`, "EEE, d MMM") })}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-line bg-cream px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="action" disabled={isPending} className="px-5">
              {isPending ? <Loader /> : <Check strokeWidth={2.5} />}
              {t("Save")}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
