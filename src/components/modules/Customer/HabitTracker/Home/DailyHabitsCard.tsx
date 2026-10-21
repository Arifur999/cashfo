"use client";

import { Check, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createElement, useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import Card from "@/components/smartly/Card";
import type { Habit, HabitToday } from "@/lib/customer/api";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { actionError, amountLabel, countStep, ruleLabel, streakText } from "@/lib/customer/habitDisplay";
import { doneToday } from "@/lib/customer/habitsHome";
import { checkInHabitAction, removeCheckInAction } from "@/lib/customer/habitsActions";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AmountPopover } from "../Tracker/AmountPopover";

interface DailyHabitsCardProps {
  rows: HabitToday[];
  resting: Habit[];
  today: string;
  // Phones have no page header, so the card offers Add habit itself.
  onAddHabit: () => void;
}

type LogUpdate = { id: string; completed: boolean; value: number | null };

// The done ring in the header: 40px across, a 4px stroke.
const RING_RADIUS = 16;
const RING = 2 * Math.PI * RING_RADIUS;

// Today's habits with a tick each; a counted habit gets a plus instead and
// its figure opens a field to type the amount. Phones get the board's taller
// rows: 44px ticks, and a counted habit's one-less / count / one-more.
export function DailyHabitsCard({ rows: serverRows, resting, today, onAddHabit }: DailyHabitsCardProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [rows, applyLog] = useOptimistic(serverRows, (current, update: LogUpdate) => current.map((row) => (row.id === update.id ? { ...row, todayLog: { id: row.todayLog?.id ?? "optimistic", habitId: row.id, date: today, completed: update.completed, value: update.value, note: row.todayLog?.note ?? null, createdAt: row.todayLog?.createdAt ?? today } } : row)));
  const [isPending, startTransition] = useTransition();
  const done = doneToday(rows);

  function run(update: LogUpdate, action: () => Promise<{ success: boolean; message?: string }>) {
    startTransition(async () => {
      applyLog(update);
      const result = await action();
      if (result.success) router.refresh();
      else toast.error(actionError(result.message, "Failed to check in", t, locale));
    });
  }

  // Undoing a day keeps its note: the log stays, marked not done.
  const undo = (row: HabitToday) => (row.todayLog?.note ? checkInHabitAction(row.id, { date: today, completed: false, value: row.targetValue ? 0 : undefined }) : removeCheckInAction(row.id, today));

  // A counted habit moves to a new count; nothing left clears the day.
  function count(row: HabitToday, next: number) {
    const target = row.targetValue ?? 1;
    const value = Math.max(0, next);
    run({ id: row.id, completed: value >= target, value }, () => (value === 0 ? undo(row) : checkInHabitAction(row.id, { date: today, value, completed: value >= target })));
  }

  function tap(row: HabitToday) {
    const log = row.todayLog;
    if (row.targetValue) {
      // A finished count steps back one, never to nothing.
      count(row, log?.completed ? row.targetValue - 1 : Math.min(row.targetValue, (log?.value ?? 0) + countStep(row.targetValue)));
      return;
    }
    run({ id: row.id, completed: !log?.completed, value: null }, () => (log?.completed ? undo(row) : checkInHabitAction(row.id, { date: today, completed: true })));
  }

  const restLine = resting.length > 0 ? t(resting.length === 1 ? "{names} rests today" : "{names} rest today", { names: resting.map((habit) => habit.name).join(", ") }) : t("Every habit is planned today");
  const doneLine = (key: string) => t(key, { done: formatCount(done, locale), total: formatCount(rows.length, locale) });

  return (
    <Card padding="none" className="flex flex-col gap-1 px-4 pt-4 pb-2 md:gap-3 md:px-5 md:pt-5 md:pb-4">
      <div className="flex items-center justify-between gap-3 px-0.5 pb-1 md:p-0">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-title font-semibold text-ink max-md:leading-[normal]">{t("Daily habits")}</h2>
          <span className="text-small text-ink-muted max-md:hidden">{rows.length === 0 ? t("Nothing planned for today") : doneLine("{done} of {total} done today")}</span>
          {rows.length > 0 && <span className="text-small font-semibold text-emerald md:hidden">{doneLine("{done} of {total} done")}</span>}
        </div>
        {/* The text line beside it already says how many are done. */}
        {rows.length > 0 && (
          <span aria-hidden="true" className="relative size-10 shrink-0 max-md:hidden">
            <svg viewBox="0 0 40 40" className="size-10 -rotate-90">
              <circle cx="20" cy="20" r={RING_RADIUS} className="fill-none stroke-surface-sunken dark:stroke-line" strokeWidth="4" />
              <circle cx="20" cy="20" r={RING_RADIUS} className="fill-none stroke-emerald" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(done / rows.length) * RING} ${RING}`} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-caption font-bold text-ink tabular-nums">
              {formatCount(done, locale)}/{formatCount(rows.length, locale)}
            </span>
          </span>
        )}
        {/* Phones have no page header: Add habit lives here. */}
        <button type="button" onClick={onAddHabit} className="flex h-11 shrink-0 items-center gap-1.5 rounded-md px-2 text-small font-semibold text-brand-ink hover:bg-surface-sunken md:hidden">
          <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
          {t("Add habit")}
        </button>
      </div>
      {rows.length === 0 && <span className="border-t border-divider py-3 text-small text-ink-muted md:hidden">{t("Nothing planned for today")}</span>}
      <ul className="flex flex-col gap-1">
        {rows.map((row) => {
          const tone = categoryTone(row.color);
          const log = row.todayLog;
          const counted = !!row.targetValue;
          const target = row.targetValue ?? 1;
          const step = countStep(target);
          const isDone = !!log?.completed;
          const value = log?.value ?? 0;
          const figure = t("{value} of {amount}", { value: formatCount(value, locale), amount: amountLabel(target, row.unit, t, locale) });
          const sub = counted ? figure : row.streak > 0 ? streakText(row, row.streak, t, locale, true) : ruleLabel(row, t, locale).days;
          const amount = (className: string) => (
            <AmountPopover name={row.name} value={value} target={target} unit={row.unit} disabled={isPending} onSave={(next) => count(row, next)} triggerClassName={className}>
              {formatCount(value, locale)}/{formatCount(target, locale)}
            </AmountPopover>
          );
          return (
            <li key={row.id} className="box-content flex min-h-13 items-center gap-3 border-t border-divider md:min-h-10.5 md:border-0">
              <span className={cn("flex size-8.5 shrink-0 items-center justify-center rounded-md [&_svg]:size-4 md:size-7.5", tone.bg, tone.fg)}>{createElement(budgetCategoryIcon(row.icon), { "aria-hidden": true })}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="truncate text-body font-medium text-ink">{row.name}</span>
                <span className="truncate text-caption font-normal text-ink-muted">{sub}</span>
              </span>
              {counted && (
                <>
                  <span className="flex items-center gap-1 md:hidden">
                    <button type="button" onClick={() => count(row, value - step)} disabled={isPending || value === 0} aria-label={step === 1 ? t("One less: {name}", { name: row.name }) : t("{count} less: {name}", { count: formatCount(step, locale), name: row.name })} className="flex size-9 items-center justify-center rounded-md border border-line-strong bg-surface text-ink-2 disabled:opacity-50 pointer-coarse:size-11">
                      <Minus className="size-4" strokeWidth={2.5} aria-hidden="true" />
                    </button>
                    {amount("flex h-9 min-w-10 items-center justify-center px-1 text-center text-body font-bold text-ink pointer-coarse:h-11")}
                    {/* The habit's own colour behind a plus in the surface colour (white, or the night in dark mode). */}
                    <button type="button" onClick={() => count(row, value + step)} disabled={isPending || isDone} aria-label={step === 1 ? t("One more: {name}", { name: row.name }) : t("{count} more: {name}", { count: formatCount(step, locale), name: row.name })} className={cn("flex size-9 items-center justify-center rounded-md bg-current disabled:opacity-50 pointer-coarse:size-11", tone.fg)}>
                      <Plus className="size-4 text-surface" strokeWidth={2.5} aria-hidden="true" />
                    </button>
                  </span>
                  {amount("hidden h-8 items-center px-1.5 text-small font-semibold text-ink-2 md:flex")}
                </>
              )}
              <button
                type="button"
                onClick={() => tap(row)}
                disabled={isPending}
                aria-pressed={isDone}
                aria-label={counted && !isDone ? (step === 1 ? t("One more: {name}", { name: row.name }) : t("{count} more: {name}", { count: formatCount(step, locale), name: row.name })) : isDone ? t("{name}, done. Tap to undo", { name: row.name }) : t("Mark {name} as done", { name: row.name })}
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-60 md:size-8",
                  counted && "max-md:hidden",
                  isDone ? "bg-emerald text-on-action" : counted ? "border-[1.5px] border-emerald text-emerald hover:bg-mint-50" : "border-[1.5px] border-line-strong text-ink-muted hover:border-emerald hover:text-emerald md:text-transparent",
                )}
              >
                {counted && !isDone ? <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" /> : <Check className="size-5 md:size-4" strokeWidth={3} aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-divider px-0.5 pt-2 pb-1 text-small text-ink-muted md:px-0 md:pt-3 md:pb-0">
        <span className="min-w-0 md:truncate">
          {restLine}
          {resting.length === 1 && <span className="md:hidden"> ({ruleLabel(resting[0], t, locale).days})</span>}
        </span>
        <Link href="/habit-tracker/daily" className="flex shrink-0 items-center font-semibold text-emerald hover:underline max-md:min-h-11">
          {t("All habits")}
        </Link>
      </div>
    </Card>
  );
}
