"use client";

import type { HabitMonthTracker } from "@/lib/customer/api";
import { WEEKDAY_SHORT } from "@/lib/customer/habitDisplay";
import { canMark, cellState, dayTotals, prayerSummaries, weekdayOfDay } from "@/lib/customer/namazDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { DayTotal, SheetBox } from "../Tracker/SheetBox";

interface PrayerSheetProps {
  tracker: HabitMonthTracker;
  onToggle: (day: number, item: string, checked: boolean) => void;
  // The label of the totals row ("Prayed that day").
  totalsLabel: string;
  // Names each row ("Fajr" → translated).
  rowLabel?: (item: string) => string;
  disabled?: boolean;
}

// The Namaz month sheet: one row per prayer, one box per day, the weekday
// above each day with Fridays tinted and today picked out, and how many
// were prayed each day along the bottom.
export function PrayerSheet({ tracker, onToggle, totalsLabel, rowLabel = (item) => item, disabled = false }: PrayerSheetProps) {
  const { t } = useLocale();
  const days = Array.from({ length: tracker.totalDays }, (_, i) => i + 1);
  const totals = dayTotals(tracker);
  const summaries = prayerSummaries(tracker);
  const full = tracker.items.length;

  return (
    <div role="grid" aria-label={t("Prayer sheet")} className="flex flex-col gap-0.75 overflow-x-auto pb-1">
      <div role="row" className="mb-0.75 flex items-end gap-0.75">
        <span className="w-30 shrink-0" />
        {days.map((day) => {
          const weekday = weekdayOfDay(tracker, day);
          const today = tracker.todayDay === day;
          const friday = weekday === 5;
          return (
            <span key={day} role="columnheader" title={`${today ? `${t("Today")}, ` : ""}${t(WEEKDAY_SHORT[weekday])} ${day}${friday ? ` · ${t("Jumu'ah")}` : ""}`} className={cn("flex w-6.75 shrink-0 flex-col items-center gap-px rounded-sm py-0.75 text-caption font-semibold tabular-nums", today ? "bg-emerald text-white" : friday ? "bg-warning-soft text-warning" : "text-ink-muted")}>
              <span>{day}</span>
              <span className="text-[11px] font-semibold opacity-80">{t(WEEKDAY_SHORT[weekday]).slice(0, 2)}</span>
            </span>
          );
        })}
      </div>
      {tracker.items.map((item) => {
        const summary = summaries.find((s) => s.item === item);
        return (
          <div key={item} role="row" className="flex items-center gap-0.75">
            <span role="rowheader" className="flex w-30 shrink-0 items-baseline justify-between pr-3">
              <span className="truncate text-body font-semibold text-ink">{rowLabel(item)}</span>
              <span className="text-caption font-normal text-ink-muted tabular-nums">
                {summary?.prayed ?? 0}/{summary?.due ?? 0}
              </span>
            </span>
            {days.map((day) => {
              const state = cellState(tracker, day, item);
              const boxState = state === "prayed" ? "done" : state;
              return <SheetBox key={day} state={boxState} disabled={disabled || !canMark(tracker, day)} onToggle={() => onToggle(day, item, state !== "prayed")} label={`${rowLabel(item)}, ${day}: ${t(state === "prayed" ? "prayed" : state === "missed" ? "missed" : state === "open" ? "not marked yet" : "later this month")}`} />;
            })}
          </div>
        );
      })}
      <div role="row" className="mt-1 flex items-center gap-0.75 border-t border-dashed border-line pt-2">
        <span role="rowheader" className="w-30 shrink-0 text-small font-semibold text-ink-2">
          {totalsLabel}
        </span>
        {totals.map((total) => (
          <DayTotal key={total.day} count={total.state === "locked" ? null : total.prayed} of={full} open={total.state === "open"} title={`${total.prayed} ${t("of")} ${full} ${t("prayed")}${total.state === "open" ? ` ${t("so far")}` : ""}`} />
        ))}
      </div>
    </div>
  );
}
