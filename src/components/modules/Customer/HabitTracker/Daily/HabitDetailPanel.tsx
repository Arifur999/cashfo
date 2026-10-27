"use client";

import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useState, useTransition } from "react";
import { toast } from "sonner";
import Card from "@/components/smartly/Card";
import Textarea from "@/components/smartly/form/Textarea";
import type { Habit, HabitMonthLog } from "@/lib/customer/api";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { shiftMonth } from "@/lib/customer/groupDisplay";
import { actionError, amountLabel, bestStreak, countsOn, countTone, dayMark, dayText, HABIT_UNITS, instantText, monthGrid, ruleLine, streakText, unitLabel, WEEK_START, WEEKDAY_MIN } from "@/lib/customer/habitDisplay";
import { checkInHabitAction } from "@/lib/customer/habitsActions";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface HabitDetailPanelProps {
  habit: Habit;
  today: string;
  // The day the page shows.
  day: string;
  // "YYYY-MM": the month this panel shows, which can differ from the day's.
  month: string;
  // The logs of the 60 days up to today (for the best streak), whatever
  // day the page shows, and the shown month's.
  bestLogs: HabitMonthLog[];
  monthLogs: HabitMonthLog[];
  streak: number;
  // The best run over the habit's whole history, from the stats; without
  // it the panel works the best out of the last 60 days' logs.
  bestStreak?: number;
  // Today's note, when the viewed day is today.
  note: string | null;
  todayLog: { completed: boolean; value: number | null } | null;
  onEdit: () => void;
  onMonthChange: (month: string) => void;
  // The panel sits in a bottom sheet (below 1400px), which has a title of its own.
  inSheet?: boolean;
}

const MARK_CLASS = {
  done: "text-surface",
  missed: "bg-expense-soft text-expense",
  open: "border-[1.5px] border-dashed border-line-strong text-ink-2",
  rest: "bg-surface text-ink-muted",
  future: "bg-surface text-ink-muted/60",
} as const;

// How far back the best streak looks: the 60 days up to today, whose months
// the page loads for it (daily/page.tsx).
const BEST_LOOK_BACK = 60;

// One habit's month: its streaks, every day of the month coloured, and a
// note for today. The month arrows leaf through the habit's months alone;
// the day's list stays where it is.
export function HabitDetailPanel({ habit, today, day, month, bestLogs, monthLogs: shownLogs, streak, bestStreak: allTimeBest, note, todayLog, onEdit, onMonthChange, inSheet = false }: HabitDetailPanelProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [draft, setDraft] = useState(note ?? "");
  const [savedFor, setSavedFor] = useState(`${habit.id}:${note ?? ""}`);
  const [isPending, startTransition] = useTransition();
  if (savedFor !== `${habit.id}:${note ?? ""}`) {
    setSavedFor(`${habit.id}:${note ?? ""}`);
    setDraft(note ?? "");
  }

  const count = (n: number) => formatCount(n, locale);
  const tone = categoryTone(habit.color);
  const [year, monthNumber] = month.split("-").map(Number);
  const cells = monthGrid(year, monthNumber);
  const monthDays = cells.filter((c): c is string => c !== null && c <= today);
  const monthLogs = shownLogs.filter((l) => l.habitId === habit.id && l.date.slice(0, 7) === month);
  const doneThisMonth = monthDays.filter((d) => monthLogs.some((l) => l.completed && l.date.slice(0, 10) === d)).length;
  const plannedThisMonth = monthDays.filter((d) => countsOn(habit, shownLogs, d)).length;
  const counted = !!habit.targetValue;
  const target = habit.targetValue ?? 0;
  // Over the planned days, so a missed day counts as nothing rather than not at all.
  const total = monthLogs.reduce((sum, l) => sum + (l.value ?? 0), 0);
  const average = plannedThisMonth > 0 ? Math.round((total / plannedThisMonth) * 10) / 10 : null;
  const best = Math.max(streak, allTimeBest ?? bestStreak(habit, bestLogs, today, BEST_LOOK_BACK));
  const rate = plannedThisMonth > 0 ? Math.round((doneThisMonth / plannedThisMonth) * 100) : null;
  const thisMonth = month === today.slice(0, 7);
  const name = monthName(month, locale);
  // The goal's middle band (close, not yet there) only when it has room.
  const near = Math.ceil(target * 0.75);

  const facts = [
    { label: t("Current streak"), value: streakText(habit, streak, t, locale) },
    { label: allTimeBest !== undefined ? t("Best streak") : t("Best, last 60 days"), value: streakText(habit, best, t, locale) },
    { label: name, value: t("{done} of {total} days", { done: count(doneThisMonth), total: count(plannedThisMonth) }) },
    counted
      ? { label: t("Daily average"), value: average === null ? "—" : amountLabel(average, habit.unit, t, locale) }
      : { label: thisMonth ? t("This month") : t("Rate in {month}", { month: name }), value: rate === null ? "—" : `${count(rate)}%` },
  ];

  const canGoNext = month < today.slice(0, 7);
  const subtitle = [ruleLine(habit, t, locale), t("added {date}", { date: instantText(habit.createdAt, locale) })].join(" · ");

  function saveNote() {
    if (day !== today || draft === (note ?? "") || isPending) return;
    startTransition(async () => {
      const result = await checkInHabitAction(habit.id, { date: today, completed: todayLog?.completed ?? false, value: todayLog?.value ?? undefined, note: draft.trim() });
      if (result.success) {
        toast.success(t("Note saved"));
        // The page's copy of today's log carries the note; without this,
        // coming back to the habit would show the old one.
        router.refresh();
      } else {
        toast.error(actionError(result.message, "Failed to save the note", t, locale));
      }
    });
  }

  const Heading = inSheet ? "h3" : "h2";

  return (
    <Card padding="none" elevated={!inSheet} className={cn("flex flex-col gap-4 rounded-md px-5 py-4.5", inSheet && "border-0")}>
      <div className="flex items-center gap-3">
        <span className={cn("flex size-10.5 shrink-0 items-center justify-center rounded-[11px] [&_svg]:size-5", tone.bg, tone.fg)}>{createElement(budgetCategoryIcon(habit.icon), { "aria-hidden": true })}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Heading className="truncate text-title leading-[normal] font-semibold text-ink">{habit.name}</Heading>
          <span className="truncate text-[12.5px] leading-[normal] text-ink-muted">{subtitle}</span>
        </span>
        <button type="button" onClick={onEdit} aria-label={t("Edit {name}", { name: habit.name })} className="flex size-8.5 shrink-0 items-center justify-center rounded-sm border border-line bg-surface text-ink-soft hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11">
          <Pencil className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {facts.map((fact) => (
          <div key={fact.label} className="flex min-w-0 flex-col gap-0.5 rounded-field bg-strip px-3 py-2.5">
            <span className="text-caption leading-[normal] font-normal text-ink-muted">{fact.label}</span>
            <span className="text-[17px] leading-[normal] font-bold text-ink tabular-nums">{fact.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => onMonthChange(shiftMonth(month, -1))} aria-label={monthName(shiftMonth(month, -1), locale, "long", true)} className="flex size-7.5 items-center justify-center rounded-sm text-ink-soft hover:bg-surface-sunken pointer-coarse:size-11">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <span className="text-body font-semibold text-ink">{monthName(month, locale, "long", true)}</span>
          <button type="button" disabled={!canGoNext} onClick={() => onMonthChange(shiftMonth(month, 1))} aria-label={monthName(shiftMonth(month, 1), locale, "long", true)} className="flex size-7.5 items-center justify-center rounded-sm text-ink-soft hover:bg-surface-sunken disabled:opacity-40 pointer-coarse:size-11">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div aria-hidden="true" className="grid grid-cols-7 gap-1.25 text-center text-[11.5px] leading-[normal] font-semibold text-ink-faint">
          {Array.from({ length: 7 }, (_, i) => (WEEK_START + i) % 7).map((d) => (
            <span key={d} className={cn(d === 5 && "text-warning")}>
              {t(WEEKDAY_MIN[d])}
            </span>
          ))}
        </div>
        {/* One picture with a summary; each day's state is in its title. */}
        <div role="img" aria-label={t("{month}: {done} of {total} planned days done", { month: monthName(month, locale, "long", true), done: count(doneThisMonth), total: count(plannedThisMonth) })} className="grid grid-cols-7 gap-1.25">
          {cells.map((cell, i) => {
            if (!cell) return <span key={i} className="h-9.5" />;
            const mark = dayMark(habit, shownLogs, cell, today);
            const log = monthLogs.find((l) => l.date.slice(0, 10) === cell);
            // A zero is no amount: a day brought back to 0 reads as missed,
            // rest or open, as its week dots do, not as a low amount.
            const value = log?.value || null;
            const fill = counted && value !== null ? countTone(value, target) : null;
            const current = cell === day;
            const strong = fill === "full" || (!fill && mark === "done");
            return (
              <span
                key={cell}
                title={`${dayText(cell, locale, "dayMonth")}: ${counted && value !== null ? amountLabel(value, habit.unit, t, locale) : t(mark === "done" ? "done" : mark === "missed" ? "missed" : mark === "rest" ? "not planned" : mark === "open" ? "still open" : "not yet")}`}
                className={cn(
                  "flex h-9.5 flex-col items-center justify-center rounded-sm text-[11.5px] leading-[normal] font-semibold tabular-nums",
                  fill ? cn(tone.fg, fill === "full" ? "bg-current" : fill === "near" ? "bg-current/45" : tone.bg) : mark === "done" ? cn("bg-current", tone.fg) : MARK_CLASS[mark],
                  current && "ring-2 ring-emerald ring-offset-1 ring-offset-surface",
                )}
              >
                {/* Ink in the surface colour on a filled day: white, or the night in dark mode. */}
                <span className={cn(strong ? "text-surface" : fill === "near" ? "text-ink" : "")}>{count(Number(cell.slice(8)))}</span>
                {counted && value !== null && <span className={cn("text-[10px] leading-none font-medium opacity-85", strong ? "text-surface" : fill === "near" ? "text-ink" : "")}>{count(value)}</span>}
              </span>
            );
          })}
        </div>
        {counted && target > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-x-1.5 gap-y-1 text-[11.5px] leading-[normal] font-normal text-ink-muted">
            {/* Only a chip unit is capitalised; a typed one ("ml", "km") stays as typed. */}
            <span className={cn("inline-block", habit.unit && HABIT_UNITS.includes(habit.unit.trim()) && "first-letter:uppercase")}>{habit.unit ? `${unitLabel(habit.unit, t)}:` : t("Amount:")}</span>
            {near < target && (
              <>
                <span className="flex items-center gap-1">
                  <span className={cn("size-3 rounded-[3px]", tone.bg)} /> {t("under {count}", { count: count(near) })}
                </span>
                <span className="flex items-center gap-1">
                  <span className={cn("size-3 rounded-[3px] bg-current/45", tone.fg)} /> {near === target - 1 ? count(near) : `${count(near)}–${count(target - 1)}`}
                </span>
              </>
            )}
            {near >= target && (
              <span className="flex items-center gap-1">
                <span className={cn("size-3 rounded-[3px]", tone.bg)} /> {t("under {count}", { count: count(target) })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className={cn("size-3 rounded-[3px] bg-current", tone.fg)} /> {t("{count} or more", { count: count(target) })}
            </span>
          </div>
        )}
      </div>

      {day === today && (
        <div className="flex flex-col gap-1.5 border-t border-divider pt-3.5">
          <label htmlFor={inSheet ? "hb-note-sheet" : "hb-note"} className="text-small font-semibold text-ink">
            {t("Note for today")} <span className="font-normal text-ink-muted">({t("optional")})</span>
          </label>
          <Textarea id={inSheet ? "hb-note-sheet" : "hb-note"} rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={saveNote} maxLength={200} placeholder={t("How did it go?")} disabled={isPending} className="resize-none" />
        </div>
      )}
    </Card>
  );
}
