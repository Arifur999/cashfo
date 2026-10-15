"use client";

import { Check, X } from "lucide-react";
import type { HabitMonthTracker } from "@/lib/customer/api";
import { canMark, cellState, dayTotals, prayerSummaries, weekdayOfDay } from "@/lib/customer/namazDisplay";
import { WEEKDAY_SHORT } from "@/lib/customer/habitDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface PrayerSheetProps {
  tracker: HabitMonthTracker;
  onToggle: (day: number, item: string, checked: boolean) => void;
  // Days are real calendar days (Namaz): show the weekday and tint Fridays.
  calendar?: boolean;
  // The label of the totals row ("Prayed that day").
  totalsLabel: string;
  // Names each row ("Fajr" → translated).
  rowLabel?: (item: string) => string;
  disabled?: boolean;
}

// The month sheet: one row per prayer (or item), one 27px box per day,
// the weekday above each day with Fridays tinted and today picked out, and
// how many were prayed each day along the bottom. Tap a box to change it.
export function PrayerSheet({ tracker, onToggle, calendar = true, totalsLabel, rowLabel = (item) => item, disabled = false }: PrayerSheetProps) {
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
          const weekday = calendar ? weekdayOfDay(tracker, day) : null;
          const today = tracker.todayDay === day;
          const friday = weekday === 5;
          return (
            <span key={day} role="columnheader" title={`${today ? `${t("Today")}, ` : ""}${weekday !== null ? `${t(WEEKDAY_SHORT[weekday])} ` : ""}${day}${friday ? ` · ${t("Jumu'ah")}` : ""}`} className={cn("flex w-6.75 shrink-0 flex-col items-center gap-px rounded-sm py-0.75 text-caption font-semibold tabular-nums", today ? "bg-emerald text-white" : friday ? "bg-warning-soft text-warning" : "text-ink-muted")}>
              <span>{day}</span>
              {weekday !== null && <span className="text-[11px] font-semibold opacity-80">{t(WEEKDAY_SHORT[weekday]).slice(0, 2)}</span>}
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
              const markable = !disabled && canMark(tracker, day);
              const label = `${rowLabel(item)}, ${day}: ${t(state === "prayed" ? "prayed" : state === "missed" ? "missed" : state === "open" ? "not marked yet" : "later this month")}`;
              return (
                <button
                  key={day}
                  type="button"
                  role="gridcell"
                  aria-label={label}
                  title={label}
                  disabled={!markable}
                  onClick={() => onToggle(day, item, state !== "prayed")}
                  className={cn(
                    "flex size-6.75 shrink-0 items-center justify-center rounded-sm transition-colors",
                    state === "prayed" && "bg-emerald text-white hover:bg-emerald-hover",
                    state === "missed" && "bg-expense-soft text-expense hover:bg-expense-soft/70",
                    state === "open" && "border-[1.5px] border-dashed border-emerald bg-surface hover:bg-mint-50",
                    state === "locked" && "cursor-not-allowed border border-surface-sunken bg-cream",
                  )}
                >
                  {state === "prayed" && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
                  {state === "missed" && <X className="size-3" strokeWidth={3} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        );
      })}
      <div role="row" className="mt-1 flex items-center gap-0.75 border-t border-dashed border-line pt-2">
        <span role="rowheader" className="w-30 shrink-0 text-small font-semibold text-ink-2">
          {totalsLabel}
        </span>
        {totals.map((total) => (
          <span key={total.day} title={total.state === "locked" ? "" : `${total.prayed} ${t("of")} ${full} ${t("prayed")}${total.state === "open" ? ` ${t("so far")}` : ""}`} className={cn("flex h-5.5 w-6.75 shrink-0 items-center justify-center rounded-[5px] text-caption font-bold tabular-nums", total.state === "locked" ? "text-transparent" : total.state === "open" ? "bg-surface-sunken text-ink-2" : total.prayed === full ? "bg-mint-50 text-emerald" : total.prayed >= full - 1 ? "bg-surface-sunken text-ink-2" : "bg-expense-soft text-expense")}>
            {total.state === "locked" ? "" : total.prayed}
          </span>
        ))}
      </div>
    </div>
  );
}
