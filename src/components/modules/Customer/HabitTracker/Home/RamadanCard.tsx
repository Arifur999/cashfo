"use client";

import { Check, MoonStar, Sunset } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";
import Card from "@/components/smartly/Card";
import type { HabitMonthTracker } from "@/lib/customer/api";
import { timeLabel } from "@/lib/customer/date";
import { actionError, dayText, nextRamadan } from "@/lib/customer/habitDisplay";
import { setHabitTrackerCheckAction } from "@/lib/customer/habitsActions";
import { clockOf, prayerTimesFor } from "@/lib/customer/prayerTimes";
import { ramadanSummary, ramadanWindow } from "@/lib/customer/ramadanDisplay";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { withCheck } from "../trackerChecks";

interface RamadanCardProps {
  trackers: HabitMonthTracker[];
  today: string;
}

const ROZA = "Roza";

// How far off the next Ramadan is, and how the last one went. While Ramadan
// is going on it is today's Ramadan instead: the day, today's Roza to tick
// and when Iftar is, with the sheet a tap away -- on phones too.
export function RamadanCard({ trackers, today }: RamadanCardProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const { settings } = usePrayerSettings();
  const { hijriAdjust } = settings;
  const [, startTransition] = useTransition();
  const next = nextRamadan(today, hijriAdjust);
  const sheets = [...trackers].sort((a, b) => (b.year ?? 0) - (a.year ?? 0)).map((tracker) => ({ tracker, window: ramadanWindow(tracker, today, hijriAdjust) }));
  const goingSheet = sheets.find(({ window }) => window.status === "going") ?? null;
  const [going, applyTick] = useOptimistic(goingSheet?.tracker ?? null, (tracker, checked: boolean) => (tracker && goingSheet?.window.todayDay ? withCheck(tracker, goingSheet.window.todayDay, ROZA, checked) : tracker));
  const last = sheets.find(({ window }) => window.status === "completed");
  const year = (value: number | null | undefined) => toLocaleDigits(String(value ?? ""), locale);

  if (goingSheet && going) {
    const day = goingSheet.window.todayDay ?? 1;
    const fasted = going.checks.some((c) => c.day === day && c.item === ROZA);
    const iftar = timeLabel(clockOf(prayerTimesFor(settings, today).Maghrib), t);

    const sheetId = going.id;
    const tick = () =>
      startTransition(async () => {
        applyTick(!fasted);
        const result = await setHabitTrackerCheckAction(sheetId, { day, item: ROZA, checked: !fasted });
        if (result.success) router.refresh();
        else toast.error(actionError(result.message, "Failed to update", t, locale));
      });

    return (
      <Card padding="none" className="flex flex-col gap-3 bg-[linear-gradient(160deg,var(--mint-50)_0%,var(--surface)_70%)] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-title font-semibold text-ink">{t("Ramadan {year}", { year: year(goingSheet.window.hijriYear ?? going.year) })}</h2>
          <MoonStar className="size-4.5 text-emerald" aria-hidden="true" />
        </div>
        <span className="text-h2 text-brand-ink tabular-nums">{t("Day {day} of {total}", { day: formatCount(day, locale), total: formatCount(going.totalDays, locale) })}</span>
        <div className="flex flex-wrap items-center gap-3">
          {going.items.includes(ROZA) && (
            <button type="button" onClick={tick} aria-pressed={fasted} className={cn("flex h-11 items-center gap-2 rounded-md border px-3 text-small font-semibold transition-colors", fasted ? "border-mint-200 bg-mint-50 text-brand-ink" : "border-line-strong bg-surface text-ink hover:bg-surface-sunken")}>
              <span className={cn("flex size-5 items-center justify-center rounded-sm", fasted ? "bg-emerald text-on-action" : "border-[1.5px] border-line-strong bg-surface")}>{fasted && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}</span>
              {t("Roza today")}
            </button>
          )}
          <span className="flex items-center gap-2 text-small text-ink-2">
            <Sunset className="size-4 text-warning" aria-hidden="true" />
            {t("Iftar at {time}", { time: iftar })}
          </span>
        </div>
        <div className="mt-auto border-t border-line pt-3 text-small">
          <Link href={`/habit-tracker/habits/ramadan/${going.id}`} className="flex min-h-11 items-center font-semibold text-emerald hover:underline md:min-h-0">
            {t("Open Ramadan {year}", { year: year(goingSheet.window.hijriYear ?? going.year) })}
          </Link>
        </div>
      </Card>
    );
  }

  const summary = last ? ramadanSummary(last.tracker, last.window) : null;
  const roza = summary?.items.find((item) => item.item === ROZA) ?? summary?.items[0] ?? null;
  const quran = summary?.items.find((item) => item.item === "Quran");
  const quranDaily = !!quran && quran.of > 0 && quran.done === quran.of;
  const lastLine = roza ? t(quranDaily ? "Last Ramadan: {done} of {total} fasts, Quran every day" : "Last Ramadan: {done} of {total} fasts", { done: formatCount(roza.done, locale), total: formatCount(roza.of, locale) }) : null;

  return (
    // While Ramadan is going on with no sheet yet, phones see it too.
    <Card padding="none" className={cn("flex flex-col gap-2 bg-[linear-gradient(160deg,var(--mint-50)_0%,var(--surface)_70%)] px-5 py-4", next.daysToGo > 0 && "max-md:hidden")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title font-semibold text-ink">{t("Ramadan {year}", { year: year(next.year) })}</h2>
        <MoonStar className="size-4.5 text-emerald" aria-hidden="true" />
      </div>
      {next.daysToGo === 0 ? (
        <span className="text-h3 text-brand-ink">{t("Going on now")}</span>
      ) : (
        <>
          {/* One sentence each: the count (its number drawn large), then the day. */}
          <span className="text-h3 text-ink">{fillNodes(t(next.daysToGo === 1 ? "{count} day to go" : "{count} days to go"), { count: <span className="text-h1 text-emerald tabular-nums">{formatCount(next.daysToGo, locale)}</span> })}</span>
          <span className="text-small text-ink-2">{t("Begins around {date}, depending on the moon.", { date: dayText(next.startsOn, locale, "dayMonthYear") })}</span>
        </>
      )}
      <div className="mt-auto flex flex-col gap-0.75 border-t border-line pt-3 text-small text-ink-2">
        {lastLine && <span>{lastLine}</span>}
        {last && next.daysToGo > 0 ? (
          <Link href={`/habit-tracker/habits/ramadan/${last.tracker.id}`} className="font-semibold text-emerald hover:underline">
            {t("See Ramadan {year}", { year: year(last.window.hijriYear ?? last.tracker.year) })}
          </Link>
        ) : (
          <Link href="/habit-tracker/habits?category=Ramadan" className="flex min-h-11 items-center font-semibold text-emerald hover:underline md:min-h-0">
            {next.daysToGo === 0 ? t("Set up this Ramadan") : t("Open Ramadan")}
          </Link>
        )}
      </div>
    </Card>
  );
}
