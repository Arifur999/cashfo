"use client";

import { CheckCircle2, Circle, Flame, Plus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { budgetCategoryColorClass, budgetCategoryIcon } from "@/lib/budgetCategoryVisuals";
import { checkInHabitAction, removeCheckInAction } from "@/lib/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { HABIT_CATEGORIES, type HabitToday } from "@/lib/api";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// Icon is resolved by the caller (in its own .map() loop) and passed in,
// rather than derived here from habit.icon directly -- avoids the "component
// created during render" lint warning that firing a lookup-by-string inside
// a named component's own body (as opposed to inline in a render loop)
// triggers, even though budgetCategoryIcon() is just a static lookup table,
// never actually creating anything new.
function HabitRow({ habit, Icon }: { habit: HabitToday; Icon: LucideIcon }) {
  const { t } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(String(habit.todayLog?.value ?? habit.targetValue ?? ""));
  const isDone = habit.todayLog?.completed ?? false;

  function toggle() {
    startTransition(async () => {
      if (isDone) {
        await removeCheckInAction(habit.id, todayKey());
      } else {
        await checkInHabitAction(habit.id, { date: todayKey(), value: habit.targetValue ? Number(value) || habit.targetValue : undefined });
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${budgetCategoryColorClass(habit.color)}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-800">{habit.name}</p>
        {habit.streak > 0 && (
          <p className="flex items-center gap-1 text-xs text-amber-600">
            <Flame className="h-3 w-3" /> {habit.streak} {t("day streak")}
          </p>
        )}
      </div>
      {habit.targetValue != null && !isDone && (
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          placeholder={String(habit.targetValue)}
          className="w-16 rounded-lg border border-neutral-200 px-2 py-1.5 text-center text-sm outline-none focus:border-brand-primary"
        />
      )}
      {habit.targetValue != null && (
        <span className="shrink-0 text-xs text-neutral-400">{habit.unit}</span>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={toggle}
        title={isDone ? t("Undo") : t("Mark done")}
        className={`shrink-0 rounded-full p-1 transition-colors disabled:opacity-50 ${isDone ? "text-emerald-500" : "text-neutral-300 hover:text-neutral-400"}`}
      >
        {isDone ? <CheckCircle2 className="h-7 w-7" /> : <Circle className="h-7 w-7" />}
      </button>
    </div>
  );
}

export function HabitDashboardPageClient({ habitsToday }: { habitsToday: HabitToday[] }) {
  const { t } = useLocale();
  const doneCount = habitsToday.filter((h) => h.todayLog?.completed).length;
  const totalCount = habitsToday.length;
  const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const bestStreak = habitsToday.reduce((max, h) => Math.max(max, h.streak), 0);

  // Grouped by category (Namaz/Ramadan/Book/Course/Others, in that fixed
  // order) instead of one flat list -- a category with nothing scheduled
  // today is left out entirely rather than shown as an empty section.
  const categorizedToday = HABIT_CATEGORIES.map((category) => ({
    category,
    habits: habitsToday.filter((h) => h.category === category),
  })).filter((group) => group.habits.length > 0);

  return (
    <div className="space-y-6 px-6 py-8 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("Today's Habits")}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link
          href="/habit-tracker/habits"
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
        >
          <Plus className="h-4 w-4" /> {t("Add Habit")}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
          <p className="text-xs text-neutral-500">{t("Today's Progress")}</p>
          <p className="mt-1 text-lg font-semibold text-neutral-900">
            {doneCount}/{totalCount} ({completionPct}%)
          </p>
        </div>
        <div className="rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
          <p className="text-xs text-neutral-500">{t("Habits Today")}</p>
          <p className="mt-1 text-lg font-semibold text-neutral-900">{totalCount}</p>
        </div>
        <div className="rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
          <p className="text-xs text-neutral-500">{t("Best Streak")}</p>
          <p className="mt-1 flex items-center gap-1 text-lg font-semibold text-amber-600">
            <Flame className="h-4 w-4" /> {bestStreak}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900">{t("Checklist")}</h2>
        {habitsToday.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-neutral-400">{t("No habits scheduled for today.")}</p>
            <Link href="/habit-tracker/habits" className="mt-2 inline-block text-sm font-medium text-brand-primary hover:underline">
              {t("Add your first habit")}
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {categorizedToday.map((group) => {
              const doneInGroup = group.habits.filter((h) => h.todayLog?.completed).length;
              return (
                <div key={group.category}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t(group.category)}</h3>
                    <span className="text-xs text-neutral-400">
                      {doneInGroup}/{group.habits.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.habits.map((habit) => (
                      <HabitRow key={habit.id} habit={habit} Icon={budgetCategoryIcon(habit.icon)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
