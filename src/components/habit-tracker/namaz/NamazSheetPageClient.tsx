"use client";

import { Moon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import type { HabitMonthTracker } from "@/lib/api";
import { setHabitTrackerCheckAction } from "@/lib/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { TRACKER_MONTH_LABELS } from "../CreateMonthTrackerModal";
import { NAMAZ_THEME } from "../tracker/theme";
import { TrackerGrid, type GridColumn } from "../tracker/TrackerGrid";
import { TrackerHero } from "../tracker/TrackerHero";
import { TrackerSummary } from "../tracker/TrackerSummary";
import { withCheck } from "../trackerChecks";
import { weekdayOf } from "./namazStats";
import { NamazPrayerCards } from "./NamazPrayerCards";
import { PrayerIcon, prayerBadge } from "./PrayerIcon";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FRIDAY = 5;

// Soft column tints, painted as a background IMAGE layer on top of an opaque
// bg-surface so sticky cells stay opaque and dark mode still works.
const TINT_FRIDAY = "bg-[image:linear-gradient(rgb(14_165_233/0.11),rgb(14_165_233/0.11))]";
const TINT_TODAY = "bg-[image:linear-gradient(rgb(59_130_246/0.2),rgb(59_130_246/0.2))]";

// One month of the five prayers: prayers on the left, a column per day (with
// its weekday, Fridays and today picked out), WEEK bands and a daily-percentage
// chart on top -- the same sheet as Ramadan's, in sapphire and silver. Below
// it, the overview card and one summary card per prayer.
export function NamazSheetPageClient({ tracker }: { tracker: HabitMonthTracker }) {
  const router = useRouter();
  const { t } = useLocale();
  const [, startToggleTransition] = useTransition();

  // Server props stay the source of truth; a tick is layered on top
  // optimistically and disappears once the transition (PUT + refresh) ends.
  const [sheet, applyOptimisticCheck] = useOptimistic(tracker, (current, update: { day: number; item: string; checked: boolean }) =>
    withCheck(current, update.day, update.item, update.checked),
  );

  const { items, totalDays, todayDay, elapsedDays } = sheet;
  // Today, or every day of a month that's already over, can be ticked; the
  // server enforces the same rule. (Unticking is always allowed.)
  const lastTickableDay = todayDay ?? elapsedDays;
  const ticked = new Set(sheet.checks.map((c) => `${c.day}:${c.item}`));
  const cells = totalDays * items.length;
  const overallPct = cells > 0 ? Math.round((sheet.checks.length / cells) * 100) : 0;

  const firstWeekday = weekdayOf(sheet.year, sheet.month, 1);
  const columns: GridColumn[] = Array.from({ length: totalDays }, (_, i) => {
    const day = i + 1;
    const weekday = (firstWeekday + i) % 7;
    const isFriday = weekday === FRIDAY;
    const isToday = day === todayDay;
    return {
      day,
      tint: isToday ? TINT_TODAY : isFriday ? TINT_FRIDAY : "",
      title: isFriday ? t("Friday (Jumu'ah)") : undefined,
      weekday: t(WEEKDAY_SHORT[weekday]),
      accent: isFriday,
      current: isToday,
      locked: day > lastTickableDay,
    };
  });

  function toggleCell(day: number, item: string, checked: boolean) {
    startToggleTransition(async () => {
      applyOptimisticCheck({ day, item, checked });
      let failure: string | null = null;
      try {
        const result = await setHabitTrackerCheckAction(tracker.id, { day, item, checked });
        if (!result.success) failure = result.message ?? t("Failed to update");
      } catch {
        failure = t("Failed to update");
      }
      if (failure) toast.error(failure);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5 px-6 py-8 pb-24 md:pb-8">
      <TrackerHero
        theme={NAMAZ_THEME}
        arabic="الصلاة"
        watermark={Moon}
        title={`${t(TRACKER_MONTH_LABELS[sheet.month - 1])} ${sheet.year}`}
        subtitle={`${totalDays} ${t("days")} · ${items.length} ${t("Prayers")}`}
        back={{ href: "/habit-tracker/habits?category=Namaz", label: t("All Months") }}
      >
        <div className="rounded-2xl bg-white/10 px-5 py-2.5 text-center backdrop-blur-sm">
          <p className={`text-[11px] font-medium ${NAMAZ_THEME.heroText}`}>{t("Progress")}</p>
          <p className="text-2xl font-semibold tabular-nums">{overallPct}%</p>
        </div>
      </TrackerHero>

      <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-neutral-500">
        <span className="flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-1">
          <span className="h-2 w-2 rounded-full bg-sky-500" /> {t("Friday (Jumu'ah)")}
        </span>
        {todayDay !== null && (
          <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1">
            <span className="h-2 w-2 rounded-full bg-blue-600" /> {t("Today")}
          </span>
        )}
      </div>

      {/* Side-by-side only when the whole sheet AND the overview fit (a container
          query on this wrapper, not the viewport); otherwise the overview stacks below. */}
      <div className="@container space-y-5">
        <div className="flex flex-col gap-5 @min-[1600px]:flex-row">
          <div className="w-fit max-w-full min-w-0">
            <TrackerGrid
              theme={NAMAZ_THEME}
              variant="weekday"
              items={items}
              columns={columns}
              ticked={ticked}
              onToggle={toggleCell}
              chartLabel="Daily progress"
              cornerLabel="Prayers"
              habitWidth="[--habit-w:8.5rem] sm:[--habit-w:11rem]"
              rowHead={({ item, done, pct }) => (
                <div className="flex items-center gap-2.5">
                  <span className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:flex ${prayerBadge(item)}`}>
                    <PrayerIcon item={item} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-800" title={t(item)}>
                      {t(item)}
                    </p>
                    <p className="text-[11px] tabular-nums text-neutral-400">
                      {done}/{totalDays} · {pct}%
                    </p>
                  </div>
                </div>
              )}
            />
          </div>
          <div className="w-full max-w-2xl min-w-0 @min-[1600px]:flex @min-[1600px]:max-w-none @min-[1600px]:flex-1">
            <TrackerSummary
              theme={NAMAZ_THEME}
              title="Namaz Summary"
              icon={Moon}
              perfectTitle="Days when all five prayers were ticked"
              items={items}
              totalDays={totalDays}
              checks={sheet.checks}
              showByHabit={false}
              fill
            />
          </div>
        </div>

        <NamazPrayerCards tracker={sheet} ticked={ticked} />
      </div>
    </div>
  );
}
