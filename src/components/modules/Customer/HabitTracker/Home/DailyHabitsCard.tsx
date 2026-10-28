"use client";

import { Check, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createElement, useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import Card from "@/components/smartly/Card";
import type { Habit, HabitMonthLog, HabitToday } from "@/lib/customer/api";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { actionError, amountLabel, countStep, ruleLabel, ruleLine } from "@/lib/customer/habitDisplay";
import { doneThisWeek, doneToday } from "@/lib/customer/habitsHome";
import { checkInHabitAction, removeCheckInAction } from "@/lib/customer/habitsActions";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AmountPopover } from "../Tracker/AmountPopover";

interface DailyHabitsCardProps {
  rows: HabitToday[];
  // This month's and last month's logs, for a "few times a week" habit's week.
  logs: HabitMonthLog[];
  resting: Habit[];
  today: string;
}

type LogUpdate = { id: string; completed: boolean; value: number | null };

// The done ring in the header: 44px across, a 5px stroke.
const RING_RADIUS = 18;
const RING = 2 * Math.PI * RING_RADIUS;

// Today's habits with a tick each; a counted habit gets a plus instead, and
// its "6 of 8 glasses" opens a field to type the amount. Under each name:
// the amount so far, the week's count of a "few times a week" habit, or the
// streak. Phones get the board's taller rows: 44px ticks, and a counted
// habit's one-less / count / one-more.
export function DailyHabitsCard({ rows: serverRows, logs, resting, today }: DailyHabitsCardProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [rows, applyLog] = useOptimistic(serverRows, (current, update: LogUpdate) => current.map((row) => (row.id === update.id ? { ...row, todayLog: { id: row.todayLog?.id ?? "optimistic", habitId: row.id, date: today, completed: update.completed, value: update.value, note: row.todayLog?.note ?? null, createdAt: row.todayLog?.createdAt ?? today } } : row)));
  const [isPending, startTransition] = useTransition();
  const done = doneToday(rows);
  const count = (n: number) => formatCount(n, fmt);

  function run(update: LogUpdate, action: () => Promise<{ success: boolean; message?: string }>) {
    startTransition(async () => {
      applyLog(update);
      const result = await action();
      if (result.success) router.refresh();
      else toast.error(actionError(result.message, "Failed to check in", t, fmt));
    });
  }

  // Undoing a day keeps its note: the log stays, marked not done.
  const undo = (row: HabitToday) => (row.todayLog?.note ? checkInHabitAction(row.id, { date: today, completed: false, value: row.targetValue ? 0 : undefined }) : removeCheckInAction(row.id, today));

  // A counted habit moves to a new count; nothing left clears the day.
  function setCount(row: HabitToday, next: number) {
    const target = row.targetValue ?? 1;
    const value = Math.max(0, next);
    run({ id: row.id, completed: value >= target, value }, () => (value === 0 ? undo(row) : checkInHabitAction(row.id, { date: today, value, completed: value >= target })));
  }

  function tap(row: HabitToday) {
    const log = row.todayLog;
    if (row.targetValue) {
      // A finished count steps back one, never to nothing.
      setCount(row, log?.completed ? row.targetValue - 1 : Math.min(row.targetValue, (log?.value ?? 0) + countStep(row.targetValue)));
      return;
    }
    run({ id: row.id, completed: !log?.completed, value: null }, () => (log?.completed ? undo(row) : checkInHabitAction(row.id, { date: today, completed: true })));
  }

  const restLine = resting.length > 0 ? t(resting.length === 1 ? "{names} rests today" : "{names} rest today", { names: resting.map((habit) => habit.name).join(", ") }) : t("Every habit is planned today");
  const doneLine = (key: string) => t(key, { done: count(done), total: count(rows.length) });

  return (
    <Card padding="none" className="flex flex-col gap-1 rounded-md px-3.5 pt-3.5 pb-2 md:gap-2.5 md:px-5 md:pt-4.5 md:pb-3.5">
      <div className="flex items-center justify-between gap-3 px-0.5 pb-1 md:p-0">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-title leading-[normal] font-semibold text-ink">{t("Daily habits")}</h2>
          <span className="text-[12.5px] leading-[normal] text-ink-muted max-md:hidden">{rows.length === 0 ? t("Nothing planned for today") : doneLine("{done} of {total} done today")}</span>
        </div>
        {rows.length > 0 && <span className="text-small leading-[normal] font-semibold text-emerald md:hidden">{doneLine("{done} of {total} done")}</span>}
        {/* The text line beside it already says how many are done. */}
        {rows.length > 0 && (
          <span aria-hidden="true" className="relative size-11 shrink-0 max-md:hidden">
            <svg viewBox="0 0 44 44" className="size-11 -rotate-90">
              <circle cx="22" cy="22" r={RING_RADIUS} className="fill-none stroke-line" strokeWidth="5" />
              <circle cx="22" cy="22" r={RING_RADIUS} className="fill-none stroke-emerald" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(done / rows.length) * RING} ${RING}`} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-ink tabular-nums">
              {count(done)}/{count(rows.length)}
            </span>
          </span>
        )}
      </div>
      {rows.length === 0 && <span className="border-t border-divider py-3 text-small text-ink-muted md:hidden">{t("Nothing planned for today")}</span>}
      <ul className="flex flex-col md:gap-0.5">
        {rows.map((row) => {
          const tone = categoryTone(row.color);
          const log = row.todayLog;
          const counted = !!row.targetValue;
          const target = row.targetValue ?? 1;
          const step = countStep(target);
          const isDone = !!log?.completed;
          const value = log?.value ?? 0;
          const figure = t("{value} of {amount}", { value: count(value), amount: amountLabel(target, row.unit, t, fmt) });
          // A few times a week: how the week stands, today's tick included.
          const weekly = row.frequencyType === "WEEKLY_COUNT" ? t("{done} of {total} this week", { done: count(doneThisWeek(row.id, logs.filter((l) => l.date.slice(0, 10) !== today), today, fmt) + (isDone ? 1 : 0)), total: count(row.weeklyCount ?? 1) }) : null;
          const streak = row.streak > 0 ? t("{count}-day streak", { count: count(row.streak) }) : null;
          const sub = weekly ?? streak ?? ruleLabel(row, t, fmt).days;
          const plus = step === 1 ? t("One more: {name}", { name: row.name }) : t("{count} more: {name}", { count: count(step), name: row.name });
          return (
            <li key={row.id} className="box-content flex min-h-13 items-center gap-2.5 border-t border-divider md:min-h-10.5 md:border-0">
              <span className={cn("flex size-8.5 shrink-0 items-center justify-center rounded-[9px] [&_svg]:size-4.25 md:size-7.5 md:rounded-sm md:[&_svg]:size-4", tone.bg, tone.fg)}>{createElement(budgetCategoryIcon(row.icon), { "aria-hidden": true })}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="truncate text-body leading-[normal] font-medium text-ink md:text-[13.5px]">{row.name}</span>
                {counted ? (
                  <>
                    {/* Phones read the goal; the stepper beside it says how far along. */}
                    <span className="truncate text-caption leading-[normal] font-normal text-ink-muted md:hidden">{ruleLine(row, t, fmt)}</span>
                    {/* Wider screens: the amount so far, which opens the field to type it. */}
                    <AmountPopover name={row.name} value={value} target={target} unit={row.unit} disabled={isPending} onSave={(next) => setCount(row, next)} triggerClassName="-mx-0.5 hidden self-start truncate rounded-sm px-0.5 text-caption leading-[normal] font-normal text-ink-muted md:block">
                      {figure}
                    </AmountPopover>
                  </>
                ) : (
                  <span className="truncate text-caption leading-[normal] font-normal text-ink-muted">{sub}</span>
                )}
              </span>
              {counted && (
                <span className="flex items-center gap-1 md:hidden">
                  <button type="button" onClick={() => setCount(row, value - step)} disabled={isPending || value === 0} aria-label={step === 1 ? t("One less: {name}", { name: row.name }) : t("{count} less: {name}", { count: count(step), name: row.name })} className="flex size-9 items-center justify-center rounded-[9px] border border-input bg-surface text-ink-soft disabled:opacity-50 pointer-coarse:size-11">
                    <Minus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                  </button>
                  <AmountPopover name={row.name} value={value} target={target} unit={row.unit} disabled={isPending} onSave={(next) => setCount(row, next)} triggerClassName="flex h-9 min-w-8.5 items-center justify-center px-1 text-center text-body font-bold text-ink pointer-coarse:h-11">
                    {count(value)}/{count(target)}
                  </AmountPopover>
                  {/* The habit's own colour behind a plus in the surface colour (white, or the night in dark mode). */}
                  <button type="button" onClick={() => setCount(row, value + step)} disabled={isPending || isDone} aria-label={plus} className={cn("flex size-9 items-center justify-center rounded-[9px] bg-current disabled:opacity-50 pointer-coarse:size-11", tone.fg)}>
                    <Plus className="size-3.5 text-surface" strokeWidth={2.5} aria-hidden="true" />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={() => tap(row)}
                disabled={isPending}
                aria-pressed={isDone}
                aria-label={counted && !isDone ? plus : isDone ? t("{name}, done. Tap to undo", { name: row.name }) : t("Mark {name} as done", { name: row.name })}
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-60 md:size-8",
                  counted && "max-md:hidden",
                  isDone ? "bg-emerald text-on-action" : counted ? "border-[1.5px] border-emerald text-emerald hover:bg-mint-50" : "border-[1.5px] border-input text-ink-faint hover:border-emerald hover:text-emerald",
                )}
              >
                {counted && !isDone ? <Plus className="size-4" strokeWidth={2.75} aria-hidden="true" /> : <Check className="size-5 md:size-4" strokeWidth={2.75} aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto flex items-center justify-between gap-2.5 border-t border-divider px-0.5 pt-2 pb-1 text-[12.5px] leading-[normal] text-ink-muted md:px-0 md:pt-2.5 md:pb-0">
        <span className="min-w-0 md:truncate">
          {restLine}
          {resting.length === 1 && <span className="md:hidden"> ({ruleLabel(resting[0], t, fmt).days})</span>}
        </span>
        {/* Phones reach every habit from the menu (the board keeps the line to itself). */}
        <Link href="/habit-tracker/daily" className="flex shrink-0 items-center font-semibold text-emerald hover:underline max-md:hidden">
          {t("All habits")}
        </Link>
      </div>
    </Card>
  );
}
