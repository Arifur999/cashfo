"use client";

import { useState } from "react";
import type { HabitMonthTracker, PrayerStatus } from "@/lib/customer/api";
import { WEEKDAY_SHORT } from "@/lib/customer/habitDisplay";
import { canMark, cellState, dayTotals, prayerSummaries, weekdayOfDay } from "@/lib/customer/namazDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { DayTotal, SheetBox } from "../Tracker/SheetBox";
import { PrayerStatusMenu } from "./PrayerStatusMenu";

interface PrayerSheetProps {
  tracker: HabitMonthTracker;
  // A status for the cell, or null to clear its mark.
  onMark: (day: number, item: string, status: PrayerStatus | null) => void;
  // The label of the totals row ("Prayed that day").
  totalsLabel: string;
  // Names each row ("Fajr" → translated).
  rowLabel?: (item: string) => string;
  disabled?: boolean;
}

// The words a box reads aloud for its state.
const STATE_WORD = { jamaat: "with jama'at", onTime: "on time", qaza: "qaza, prayed after its time", missed: "missed", open: "not marked yet", locked: "later this month" } as const;

const pad = (n: number) => String(n).padStart(2, "0");

// The Namaz month sheet: one row per prayer, one box per day showing how it
// was prayed, the weekday above each day with Fridays tinted and today
// picked out, and how many were prayed each day along the bottom. A box
// opens the "how was it prayed?" menu.
export function PrayerSheet({ tracker, onMark, totalsLabel, rowLabel = (item) => item, disabled = false }: PrayerSheetProps) {
  const { t } = useLocale();
  const [active, setActive] = useState<{ day: number; item: string } | null>(null);
  const days = Array.from({ length: tracker.totalDays }, (_, i) => i + 1);
  const totals = dayTotals(tracker);
  const summaries = prayerSummaries(tracker);
  const full = tracker.items.length;
  const dayKey = (day: number) => `${tracker.year}-${pad(tracker.month ?? 1)}-${pad(day)}`;

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
              const box = <SheetBox key={day} state={state} disabled={disabled || !canMark(tracker, day)} onToggle={() => setActive({ day, item })} label={`${rowLabel(item)}, ${day}: ${t(STATE_WORD[state])}`} />;
              if (active?.day !== day || active.item !== item) return box;
              return (
                <PrayerStatusMenu
                  key={day}
                  open
                  onOpenChange={(open) => !open && setActive(null)}
                  prayer={item}
                  day={dayKey(day)}
                  state={state}
                  marked={tracker.checks.some((c) => c.day === day && c.item === item)}
                  onPick={(status) => {
                    setActive(null);
                    onMark(day, item, status);
                  }}
                >
                  {box}
                </PrayerStatusMenu>
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
          <DayTotal key={total.day} count={total.state === "locked" ? null : total.prayed} of={full} open={total.state === "open"} title={`${total.prayed} ${t("of")} ${full} ${t("prayed")}${total.state === "open" ? ` ${t("so far")}` : ""}`} />
        ))}
      </div>
    </div>
  );
}
