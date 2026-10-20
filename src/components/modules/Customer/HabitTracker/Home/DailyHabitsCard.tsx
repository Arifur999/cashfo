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
import { ruleLabel, streakWord } from "@/lib/customer/habitDisplay";
import { doneToday } from "@/lib/customer/habitsHome";
import { checkInHabitAction, removeCheckInAction } from "@/lib/customer/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface DailyHabitsCardProps {
  rows: HabitToday[];
  resting: Habit[];
  today: string;
}

type LogUpdate = { id: string; completed: boolean; value: number | null };

// Today's habits with a tick each; a counted habit gets a plus instead and
// fills up one at a time. Phones get the board's taller rows: 44px ticks,
// and a counted habit's one-less / count / one-more.
export function DailyHabitsCard({ rows: serverRows, resting, today }: DailyHabitsCardProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [rows, applyLog] = useOptimistic(serverRows, (current, update: LogUpdate) => current.map((row) => (row.id === update.id ? { ...row, todayLog: { id: row.todayLog?.id ?? "optimistic", habitId: row.id, date: today, completed: update.completed, value: update.value, note: row.todayLog?.note ?? null, createdAt: row.todayLog?.createdAt ?? today } } : row)));
  const [isPending, startTransition] = useTransition();
  const done = doneToday(rows);

  function run(update: LogUpdate, action: () => Promise<{ success: boolean; message?: string }>) {
    startTransition(async () => {
      applyLog(update);
      const result = await action();
      if (result.success) router.refresh();
      else toast.error(result.message ?? t("Failed to check in"));
    });
  }

  // A counted habit moves to a new count; nothing left clears the day.
  function count(row: HabitToday, next: number) {
    const target = row.targetValue ?? 1;
    run({ id: row.id, completed: next >= target, value: next }, () => (next === 0 ? removeCheckInAction(row.id, today) : checkInHabitAction(row.id, { date: today, value: next, completed: next >= target })));
  }

  function tap(row: HabitToday) {
    const log = row.todayLog;
    if (row.targetValue) {
      count(row, log?.completed ? 0 : Math.min(row.targetValue, (log?.value ?? 0) + 1));
      return;
    }
    run({ id: row.id, completed: !log?.completed, value: null }, () => (log?.completed ? removeCheckInAction(row.id, today) : checkInHabitAction(row.id, { date: today, completed: true })));
  }

  const restLine =
    resting.length > 0
      ? `${resting.map((habit) => habit.name).join(", ")} ${t(resting.length === 1 ? "rests today" : "rest today")}`
      : t("Every habit is planned today");

  return (
    <Card padding="none" className="flex flex-col gap-1 px-4 pt-4 pb-2 md:gap-3 md:px-5 md:pt-5 md:pb-4">
      <div className="flex items-center justify-between gap-3 px-0.5 pb-1 md:p-0">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-title font-semibold text-ink max-md:leading-[normal]">{t("Daily habits")}</h2>
          <span className="text-small text-ink-muted max-md:hidden">{rows.length === 0 ? t("Nothing planned for today") : `${done} ${t("of")} ${rows.length} ${t("done today")}`}</span>
        </div>
        {rows.length > 0 && (
          <span className="text-small font-semibold text-emerald md:hidden">
            {done} {t("of")} {rows.length} {t("done")}
          </span>
        )}
      </div>
      {rows.length === 0 && <span className="border-t border-divider py-3 text-small text-ink-muted md:hidden">{t("Nothing planned for today")}</span>}
      <ul className="flex flex-col gap-1 md:gap-0.5">
        {rows.map((row) => {
          const tone = categoryTone(row.color);
          const log = row.todayLog;
          const counted = !!row.targetValue;
          const isDone = !!log?.completed;
          const value = log?.value ?? 0;
          const sub = counted ? `${value} ${t("of")} ${row.targetValue} ${row.unit ?? ""}`.trim() : row.streak > 0 ? `${row.streak} ${t(streakWord(row, row.streak, true))}` : t(ruleLabel(row).days);
          return (
            <li key={row.id} className="box-content flex min-h-13 items-center gap-3 border-t border-divider md:h-10.5 md:min-h-0 md:border-0">
              <span className={cn("flex size-8.5 shrink-0 items-center justify-center rounded-md [&_svg]:size-4 md:size-7.5", tone.bg, tone.fg)}>{createElement(budgetCategoryIcon(row.icon), { "aria-hidden": true })}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="truncate text-body font-medium text-ink">{row.name}</span>
                <span className="truncate text-caption font-normal text-ink-muted">{sub}</span>
              </span>
              {counted && (
                <span className="flex items-center gap-1 md:hidden">
                  <button type="button" onClick={() => count(row, value - 1)} disabled={isPending || value === 0} aria-label={`${t("One less")}: ${row.name}`} className="flex size-9 items-center justify-center rounded-md border border-line-strong bg-surface text-ink-2 disabled:opacity-50">
                    <Minus className="size-4" strokeWidth={2.5} aria-hidden="true" />
                  </button>
                  <span className="min-w-8.5 text-center text-body font-bold text-ink tabular-nums">
                    {value}/{row.targetValue}
                  </span>
                  {/* The habit's own colour behind a plus in the surface colour (white, or the night in dark mode). */}
                  <button type="button" onClick={() => count(row, value + 1)} disabled={isPending || isDone} aria-label={`${t("One more")}: ${row.name}`} className={cn("flex size-9 items-center justify-center rounded-md bg-current disabled:opacity-50", tone.fg)}>
                    <Plus className="size-4 text-surface" strokeWidth={2.5} aria-hidden="true" />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={() => tap(row)}
                disabled={isPending}
                aria-pressed={isDone}
                aria-label={counted && !isDone ? `${t("One more")}: ${row.name}` : isDone ? `${row.name}, ${t("done. Tap to undo")}` : `${t("Mark as done")}: ${row.name}`}
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-60 md:size-8",
                  counted && "max-md:hidden",
                  isDone ? "bg-emerald text-white" : counted ? "border-[1.5px] border-emerald text-emerald hover:bg-mint-50" : "border-[1.5px] border-line-strong text-ink-muted hover:border-emerald hover:text-emerald md:text-transparent",
                )}
              >
                {counted && !isDone ? <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" /> : <Check className="size-5 md:size-4" strokeWidth={3} aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-divider px-0.5 pt-2 pb-1 text-small text-ink-muted md:px-0 md:pt-3 md:pb-0">
        <span className="md:truncate">
          {restLine}
          {resting.length === 1 && <span className="md:hidden"> ({t(ruleLabel(resting[0]).days)})</span>}
        </span>
        <Link href="/habit-tracker/daily" className="shrink-0 font-semibold text-emerald hover:underline max-md:hidden">
          {t("All habits")}
        </Link>
      </div>
    </Card>
  );
}
