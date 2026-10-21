"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { timeLabel } from "@/lib/customer/date";
import { actionError, dayText, hijriDate } from "@/lib/customer/habitDisplay";
import { updatePrayerSettingsAction } from "@/lib/customer/habitsActions";
import { type AsrSchool, CITIES, clockOf, METHODS, type PrayerSettings, prayerTimesFor } from "@/lib/customer/prayerTimes";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CloseButton, PanelFooter } from "../Tracker/PanelParts";

interface PrayerSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  today: string;
}

const PREVIEW = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

// The board's 48px select with 16px text, and its 38px segments.
const SELECT = "pl-4 text-body-lg font-normal";
const SEGMENTS = "[&>button]:h-9.5";

// The board's prayer time settings drawer: the city, the calculation method,
// the Asr school and the Hijri adjustment, with the day's times as they
// would read.
export function PrayerSettingsDrawer({ open, onClose, today }: PrayerSettingsDrawerProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const { settings, setSettings } = usePrayerSettings();
  const [draft, setDraft] = useState<PrayerSettings>(settings);
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setDraft(settings);
  }
  const [isPending, startTransition] = useTransition();
  const times = prayerTimesFor(draft, today);
  // A city saved from outside the list stays on offer at the top.
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
        toast.error(actionError(result.message, "Failed to save the prayer settings", t, locale));
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-115 shadow-drawer data-[side=right]:sm:max-w-115" : "rounded-t-xl data-[side=bottom]:max-h-[92dvh]")}>
        <SheetHeader className={cn("flex-row items-center justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <div className="flex flex-col gap-0.5">
            <SheetTitle className="text-h3 leading-6 text-ink">{t("Prayer time settings")}</SheetTitle>
            <SheetDescription className="text-small leading-[normal] text-ink-muted">{t("Used by Namaz, Ramadan and Today")}</SheetDescription>
          </div>
          <CloseButton onClick={onClose} label={t("Close")} />
        </SheetHeader>

        <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <Field htmlFor="ps-city" label={t("City")} hint={t("Prayer, Sehri and Iftar times are worked out for this city.")}>
              <NativeSelect id="ps-city" size="lg" value={draft.city} onChange={(event) => pickCity(event.target.value)} frameClassName="w-full" className={SELECT}>
                {cities.map((city) => (
                  <option key={city.name} value={city.name}>
                    {t(city.name)}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field htmlFor="ps-method" label={t("Calculation method")} hint={draft.method === "Karachi" ? t("The method most mosques in Bangladesh follow.") : undefined}>
              <NativeSelect id="ps-method" size="lg" value={draft.method} onChange={(event) => setDraft({ ...draft, method: event.target.value })} frameClassName="w-full" className={cn(SELECT, "truncate")}>
                {METHODS.map((method) => (
                  <option key={method.key} value={method.key}>
                    {t(method.label)}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-small leading-[normal] font-semibold text-ink-2">{t("Asr time")}</legend>
              <SegmentedControl<AsrSchool>
                options={[
                  { value: "HANAFI", label: "Hanafi (later)" },
                  { value: "SHAFII", label: "Shafi'i (earlier)" },
                ]}
                value={draft.asrSchool}
                onChange={(asrSchool) => setDraft({ ...draft, asrSchool })}
                label="Asr time"
                stretch
                className={SEGMENTS}
              />
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-small leading-[normal] font-semibold text-ink-2">{t("Hijri date")}</legend>
              <SegmentedControl<string>
                options={[
                  { value: "-1", label: "One day earlier" },
                  { value: "0", label: "As calculated" },
                  { value: "1", label: "One day later" },
                ]}
                value={String(draft.hijriAdjust)}
                onChange={(value) => setDraft({ ...draft, hijriAdjust: Number(value) })}
                label="Hijri date"
                stretch
                className={SEGMENTS}
              />
              <span className="text-caption text-ink-muted">{fillNodes(t("The moon is often seen a day later in Bangladesh. Today shows as {date}."), { date: <b className="font-bold text-ink">{hijriDate(today, locale, draft.hijriAdjust)}</b> })}</span>
            </fieldset>

            <dl className="flex flex-col rounded-lg bg-strip px-4 py-1">
              {PREVIEW.map((prayer, index) => (
                <div key={prayer} className={cn("grid grid-cols-[120px_minmax(0,1fr)] gap-4 py-3 text-body leading-5", index > 0 && "border-t border-divider")}>
                  <dt className="text-ink-muted">{t(prayer)}</dt>
                  <dd className="min-w-0 tabular-nums">{timeLabel(clockOf(times[prayer]), t)}</dd>
                </div>
              ))}
            </dl>
            <span className="text-caption text-ink-muted">{t("Preview for {date} with these settings.", { date: dayText(today, locale, "short") })}</span>
          </div>

          <PanelFooter drawer>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader /> : <Check strokeWidth={2.5} />}
              {t("Save changes")}
            </Button>
          </PanelFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
