"use client";

import { useEffect, useRef, useState } from "react";
import type { HabitMonthTracker, PrayerStatus } from "@/lib/customer/api";
import { WEEKDAY_MIN, WEEKDAY_SHORT } from "@/lib/customer/habitDisplay";
import { canMark, cellState, dayTotals, prayerSummaries, weekdayOfDay } from "@/lib/customer/namazDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { DayTotal, SheetBox } from "../Tracker/SheetBox";
import { useRovingGrid } from "../Tracker/useRovingGrid";
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
  // The dashboard's smaller sheet: 104px names, 25px boxes.
  compact?: boolean;
}

// The words a box reads aloud for its state.
const STATE_WORD = { jamaat: "with jama'at", onTime: "on time", qaza: "qaza, prayed after its time", missed: "missed", open: "not marked yet", locked: "later this month" } as const;

const pad = (n: number) => String(n).padStart(2, "0");

// The row names stay put while the days scroll under them.
const STICKY = "sticky left-0 z-10 shrink-0 border-r border-divider bg-surface pr-2.5";

// The Namaz month sheet: one row per prayer, one box per day showing how it
// was prayed, the weekday above each day with Fridays tinted and today
// picked out, and how many were prayed each day along the bottom. A box
// opens the "how was it prayed?" menu. On a phone it opens scrolled to
// today, with the prayers' names pinned on the left; the whole sheet is one
// Tab stop, its boxes reached with the arrow keys.
export function PrayerSheet({ tracker, onMark, totalsLabel, rowLabel = (item) => item, disabled = false, compact = false }: PrayerSheetProps) {
  const head = compact ? "w-26" : "w-30";
  const { t, fmt } = useLocale();
  const [active, setActive] = useState<{ day: number; item: string } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const todayHead = useRef<HTMLSpanElement>(null);
  const days = Array.from({ length: tracker.totalDays }, (_, i) => i + 1);
  const totals = dayTotals(tracker);
  const summaries = prayerSummaries(tracker);
  const full = tracker.items.length;
  const dayKey = (day: number) => `${tracker.year}-${pad(tracker.month ?? 1)}-${pad(day)}`;
  const startDay = tracker.todayDay ?? Math.max(1, Math.min(tracker.elapsedDays, tracker.totalDays));
  const grid = useRovingGrid(tracker.items.length, tracker.totalDays, { row: 0, col: startDay - 1 });
  const count = (n: number) => formatCount(n, fmt);

  // Today in view, whatever the width. Measured against the scroller itself
  // (offsetLeft would count the sidebar and the page's gutters too, and push
  // today under the pinned row names), with today's column in the middle.
  useEffect(() => {
    const box = scroller.current;
    const head = todayHead.current;
    if (!box || !head || box.scrollWidth <= box.clientWidth) return;
    const left = head.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft;
    box.scrollLeft = Math.max(0, left - box.clientWidth / 2 + head.offsetWidth / 2);
  }, []);

  // Back on the box once its menu closes, so the arrow keys carry on.
  function closeMenu(cell: { day: number; item: string }) {
    setActive(null);
    const row = tracker.items.indexOf(cell.item);
    requestAnimationFrame(() => grid.focus({ row, col: cell.day - 1 }));
  }

  return (
    <div ref={scroller} role="grid" aria-label={t("Prayer sheet")} onKeyDown={grid.onKeyDown} className="flex flex-col gap-0.75 overflow-x-auto pb-1">
      <div role="row" className={cn("flex items-end gap-0.75", compact ? "mb-0.5" : "mb-0.75")}>
        <span className={cn(STICKY, head, "self-stretch")} />
        {days.map((day) => {
          const weekday = weekdayOfDay(tracker, day);
          const today = tracker.todayDay === day;
          const friday = weekday === 5;
          return (
            <span
              key={day}
              ref={today ? todayHead : undefined}
              role="columnheader"
              title={`${today ? `${t("Today")}, ` : ""}${t(WEEKDAY_SHORT[weekday])} ${count(day)}${friday ? ` · ${t("Jumu'ah")}` : ""}`}
              className={cn("flex w-6.75 shrink-0 flex-col items-center rounded-[6px] font-semibold tabular-nums", compact ? "py-0.5 text-[11.5px]" : "gap-px py-0.75 text-caption", today ? "bg-emerald text-on-action" : friday ? "bg-warning-soft text-warning" : "text-ink-muted")}
            >
              <span>{count(day)}</span>
              <span className={cn("font-semibold opacity-80", compact ? "text-[9px]" : "text-[9.5px] leading-none")}>{t(WEEKDAY_MIN[weekday])}</span>
            </span>
          );
        })}
      </div>
      {tracker.items.map((item, row) => {
        const summary = summaries.find((s) => s.item === item);
        return (
          <div key={item} role="row" className="flex items-center gap-0.75">
            <span role="rowheader" className={cn(STICKY, head, "flex items-baseline justify-between")}>
              <span className={cn("truncate font-semibold text-ink", compact ? "text-[13px]" : "text-[13.5px]")}>{rowLabel(item)}</span>
              <span className="text-caption font-normal text-ink-muted tabular-nums">
                {count(summary?.prayed ?? 0)}/{count(summary?.due ?? 0)}
              </span>
            </span>
            {days.map((day) => {
              const state = cellState(tracker, day, item);
              const cell = { row, col: day - 1 };
              const box = (
                <SheetBox
                  key={day}
                  ref={grid.ref(cell)}
                  state={state}
                  disabled={disabled || !canMark(tracker, day)}
                  tabIndex={grid.tabIndex(cell)}
                  onFocus={() => grid.setActive(cell)}
                  onToggle={() => setActive({ day, item })}
                  label={`${rowLabel(item)}, ${count(day)}: ${t(STATE_WORD[state])}`}
                  short={compact}
                />
              );
              if (active?.day !== day || active.item !== item) return box;
              return (
                <PrayerStatusMenu
                  key={day}
                  open
                  onOpenChange={(open) => !open && closeMenu({ day, item })}
                  prayer={item}
                  day={dayKey(day)}
                  state={state}
                  marked={tracker.checks.some((c) => c.day === day && c.item === item)}
                  anchorClassName="rounded-[8px] ring-[2.5px] ring-emerald ring-offset-[0.5px] ring-offset-surface"
                  onPick={(status) => {
                    closeMenu({ day, item });
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
      <div role="row" className={cn("flex items-center gap-0.75 border-t border-dashed border-line", compact ? "mt-0.75 pt-1.5" : "mt-1.25 pt-2")}>
        <span role="rowheader" className={cn(STICKY, head, "font-semibold text-ink-soft", compact ? "text-caption" : "text-[12.5px]")}>
          {totalsLabel}
        </span>
        {totals.map((total) => (
          <DayTotal key={total.day} short={compact} count={total.state === "locked" ? null : total.prayed} label={count(total.prayed)} of={full} open={total.state === "open"} title={t(total.state === "open" ? "{done} of {total} prayed so far" : "{done} of {total} prayed", { done: count(total.prayed), total: count(full) })} />
        ))}
      </div>
    </div>
  );
}
