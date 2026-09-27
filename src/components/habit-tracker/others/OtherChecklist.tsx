"use client";

import { CheckCircle2, Circle, Flame, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { budgetCategoryColorClass, budgetCategoryIcon } from "@/lib/budgetCategoryVisuals";
import type { HabitToday } from "@/lib/api";
import { checkInHabitAction, removeCheckInAction } from "@/lib/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { OTHER_CARD } from "./otherTheme";
import { frequencyLabel, todayKey } from "./otherStats";
import { SectionTitle } from "./SectionTitle";

// Icon is resolved by the caller (in its own .map() loop) and passed in --
// avoids the "component created during render" lint error that a lookup-by-
// string inside a named component's own body triggers.
function ChecklistRow({ habit, Icon }: { habit: HabitToday; Icon: LucideIcon }) {
  const { t } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(String(habit.todayLog?.value ?? habit.targetValue ?? ""));
  const isDone = habit.todayLog?.completed ?? false;

  function toggle() {
    startTransition(async () => {
      if (isDone) await removeCheckInAction(habit.id, todayKey());
      else await checkInHabitAction(habit.id, { date: todayKey(), value: habit.targetValue ? Number(value) || habit.targetValue : undefined });
      router.refresh();
    });
  }

  return (
    <div className={`${OTHER_CARD} flex items-center gap-3 p-3`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${budgetCategoryColorClass(habit.color)}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-800">{habit.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
          <span>{frequencyLabel(habit, t)}</span>
          {habit.streak > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <Flame className="h-3 w-3" /> {habit.streak} {t("day streak")}
            </span>
          )}
        </div>
      </div>
      {habit.targetValue != null && !isDone && (
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          placeholder={String(habit.targetValue)}
          aria-label={`${t("Target")}: ${habit.name}`}
          className="w-16 rounded-lg border border-neutral-200 px-2 py-1.5 text-center text-sm outline-none focus:border-slate-500"
        />
      )}
      {habit.targetValue != null && <span className="shrink-0 text-xs text-neutral-400">{habit.unit}</span>}
      <button
        type="button"
        disabled={isPending}
        onClick={toggle}
        aria-label={`${isDone ? t("Undo") : t("Mark done")}: ${habit.name}`}
        title={isDone ? t("Undo") : t("Mark done")}
        className={`shrink-0 rounded-full p-1 transition-colors disabled:opacity-50 ${isDone ? "text-emerald-500" : "text-neutral-300 hover:text-neutral-400"}`}
      >
        {isDone ? <CheckCircle2 className="h-7 w-7" /> : <Circle className="h-7 w-7" />}
      </button>
    </div>
  );
}

// Others-category habits scheduled for today, with a big tap-to-check circle.
export function OtherChecklist({ habitsToday }: { habitsToday: HabitToday[] }) {
  const { t } = useLocale();
  return (
    <section>
      <SectionTitle title={t("Today")} count={habitsToday.length} />
      {habitsToday.length === 0 ? (
        <p className={`${OTHER_CARD} px-6 py-10 text-center text-sm text-neutral-400`}>{t("Nothing scheduled for today.")}</p>
      ) : (
        <div className="space-y-2">
          {habitsToday.map((habit) => (
            <ChecklistRow key={habit.id} habit={habit} Icon={budgetCategoryIcon(habit.icon)} />
          ))}
        </div>
      )}
    </section>
  );
}
