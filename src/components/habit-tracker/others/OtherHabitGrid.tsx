"use client";

import { Pencil, Trash2, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { budgetCategoryColorClass, budgetCategoryIcon } from "@/lib/budgetCategoryVisuals";
import type { Habit, HabitStat } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { frequencyLabel, statFor } from "./otherStats";
import { OTHER_BAR, OTHER_CARD, STATUS_CHIP } from "./otherTheme";
import { DISPLAY_STACK } from "./fonts";
import { SectionTitle } from "./SectionTitle";

type Filter = "ALL" | "ACTIVE" | "ARCHIVED";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "ARCHIVED", label: "Archived" },
];

interface OtherHabitGridProps {
  habits: Habit[];
  stats: HabitStat[];
  onEdit: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
}

// Icon is resolved by the caller (in its own .map() loop) and passed in --
// avoids the "component created during render" lint error that a lookup-by-
// string inside a named component's own body triggers.
function HabitCard({
  habit,
  stat,
  Icon,
  onEdit,
  onDelete,
}: { habit: Habit; stat: HabitStat | undefined; Icon: LucideIcon } & Pick<OtherHabitGridProps, "onEdit" | "onDelete">) {
  const { t } = useLocale();
  const pct = stat?.completionRate ?? 0;

  return (
    <article className={`${OTHER_CARD} group flex min-w-0 flex-col p-3`}>
      <div className="flex items-start gap-2.5">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${budgetCategoryColorClass(habit.color)}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 break-words text-sm font-semibold leading-snug text-neutral-900" style={{ fontFamily: DISPLAY_STACK }} title={habit.name}>
            {habit.name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-neutral-500">{frequencyLabel(habit, t)}</p>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <button
            type="button"
            onClick={() => onEdit(habit)}
            aria-label={`${t("Edit")}: ${habit.name}`}
            title={t("Edit")}
            className="rounded-md p-1.5 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(habit)}
            aria-label={`${t("Delete")}: ${habit.name}`}
            title={t("Delete")}
            className="rounded-md p-1.5 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-brand-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
          <span className={`rounded-full px-2 py-0.5 font-semibold ${habit.isArchived ? STATUS_CHIP.archived : STATUS_CHIP.active}`}>
            {t(habit.isArchived ? "Archived" : "Active")}
          </span>
          <span className="tabular-nums text-neutral-400">
            {stat ? `${stat.currentStreak} ${t("day streak")} · ${pct}%` : "--"}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
          <div className={`h-full rounded-full bg-gradient-to-r ${OTHER_BAR} transition-all duration-500`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </article>
  );
}

// Every Others habit as a card, filterable by Active/Archived -- replaces the
// plain table with something in the same family look as the other pages.
export function OtherHabitGrid({ habits, stats, onEdit, onDelete }: OtherHabitGridProps) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<Filter>("ACTIVE");
  const shown = filter === "ALL" ? habits : filter === "ACTIVE" ? habits.filter((h) => !h.isArchived) : habits.filter((h) => h.isArchived);
  const countOf = (key: Filter) => (key === "ALL" ? habits.length : key === "ACTIVE" ? habits.filter((h) => !h.isArchived).length : habits.filter((h) => h.isArchived).length);

  return (
    <section>
      <SectionTitle title={t("All habits")} />
      <div role="group" aria-label={t("All habits")} className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                active ? "border-slate-700 bg-slate-700 text-white" : "border-slate-900/15 dark:border-amber-300/25 text-slate-700 dark:text-amber-300 hover:bg-slate-600/10"
              }`}
            >
              {t(label)}
              <span className={`rounded-full px-1.5 tabular-nums ${active ? "bg-white/25 text-white" : "bg-slate-600/10 text-slate-700 dark:text-amber-300"}`}>{countOf(key)}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className={`${OTHER_CARD} px-6 py-10 text-center text-sm text-neutral-400`}>{t("No habits here yet.")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {shown.map((habit) => (
            <HabitCard key={habit.id} habit={habit} stat={statFor(stats, habit.id)} Icon={budgetCategoryIcon(habit.icon)} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  );
}
