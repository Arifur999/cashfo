"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createElement, useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import Card from "@/components/smartly/Card";
import type { Habit, HabitToday } from "@/lib/customer/api";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { ruleLabel } from "@/lib/customer/habitDisplay";
import { doneToday } from "@/lib/customer/habitsHome";
import { checkInHabitAction, removeCheckInAction } from "@/lib/customer/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface DailyHabitsCardProps {
  rows: HabitToday[];
  resting: Habit[];
  today: string;
}

// Today's habits with a tick each; a counted habit gets a plus instead and
// fills up one at a time.
export function DailyHabitsCard({ rows: serverRows, resting, today }: DailyHabitsCardProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [rows, applyLog] = useOptimistic(serverRows, (current, update: { id: string; completed: boolean; value: number | null }) => current.map((row) => (row.id === update.id ? { ...row, todayLog: { id: row.todayLog?.id ?? "optimistic", habitId: row.id, date: today, completed: update.completed, value: update.value, note: row.todayLog?.note ?? null, createdAt: row.todayLog?.createdAt ?? today } } : row)));
  const [isPending, startTransition] = useTransition();
  const done = doneToday(rows);

  function run(update: { id: string; completed: boolean; value: number | null }, action: () => Promise<{ success: boolean; message?: string }>) {
    startTransition(async () => {
      applyLog(update);
      const result = await action();
      if (result.success) router.refresh();
      else toast.error(result.message ?? t("Failed to check in"));
    });
  }

  function tap(row: HabitToday) {
    const log = row.todayLog;
    if (row.targetValue) {
      const target = row.targetValue;
      const next = log?.completed ? 0 : Math.min(target, (log?.value ?? 0) + 1);
      run({ id: row.id, completed: next >= target, value: next }, () => (next === 0 ? removeCheckInAction(row.id, today) : checkInHabitAction(row.id, { date: today, value: next, completed: next >= target })));
      return;
    }
    run({ id: row.id, completed: !log?.completed, value: null }, () => (log?.completed ? removeCheckInAction(row.id, today) : checkInHabitAction(row.id, { date: today, completed: true })));
  }

  return (
    <Card padding="none" className="flex flex-col gap-3 px-5 pt-5 pb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-title font-semibold text-ink">{t("Daily habits")}</h2>
          <span className="text-small text-ink-muted">{rows.length === 0 ? t("Nothing planned for today") : `${done} ${t("of")} ${rows.length} ${t("done today")}`}</span>
        </div>
      </div>
      <ul className="flex flex-col gap-0.5">
        {rows.map((row) => {
          const tone = categoryTone(row.color);
          const log = row.todayLog;
          const counted = !!row.targetValue;
          const isDone = !!log?.completed;
          const sub = counted ? `${log?.value ?? 0} ${t("of")} ${row.targetValue} ${row.unit ?? ""}`.trim() : row.streak > 0 ? `${row.streak} ${t(row.streak === 1 ? "day in a row" : "days in a row")}` : t(ruleLabel(row).days);
          return (
            <li key={row.id} className="flex h-10.5 items-center gap-3">
              <span className={cn("flex size-7.5 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", tone.bg, tone.fg)}>{createElement(budgetCategoryIcon(row.icon), { "aria-hidden": true })}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="truncate text-body font-medium text-ink">{row.name}</span>
                <span className="truncate text-caption text-ink-muted">{sub}</span>
              </span>
              <button type="button" onClick={() => tap(row)} disabled={isPending} aria-pressed={isDone} aria-label={counted && !isDone ? `${t("One more")}: ${row.name}` : isDone ? `${row.name}, ${t("done. Tap to undo")}` : `${t("Mark as done")}: ${row.name}`} className={cn("flex size-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-60", isDone ? "bg-emerald text-white" : counted ? "border-[1.5px] border-emerald text-emerald hover:bg-mint-50" : "border-[1.5px] border-line-strong text-transparent hover:border-emerald hover:text-emerald")}>
                {counted && !isDone ? <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" /> : <Check className="size-4" strokeWidth={3} aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-surface-sunken pt-3 text-small text-ink-muted">
        <span className="truncate">{resting.length > 0 ? `${resting.map((habit) => habit.name).join(", ")} ${t(resting.length === 1 ? "rests today" : "rest today")}` : t("Every habit is planned today")}</span>
        <Link href="/habit-tracker/daily" className="shrink-0 font-semibold text-emerald hover:underline">
          {t("All habits")}
        </Link>
      </div>
    </Card>
  );
}
