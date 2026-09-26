"use client";

import { Flame } from "lucide-react";
import { budgetCategoryColorClass, budgetCategoryIcon } from "@/lib/budgetCategoryVisuals";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { HabitStat } from "@/lib/api";

export function HabitStatsPageClient({ stats }: { stats: HabitStat[] }) {
  const { t } = useLocale();

  return (
    <div className="space-y-6 px-6 py-8 pb-24 md:pb-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("Stats")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("Streaks and completion rate over the last 30 days.")}</p>
      </div>

      {stats.length === 0 ? (
        <div className="rounded-2xl bg-surface p-10 text-center shadow-sm shadow-black/5">
          <p className="text-sm text-neutral-400">{t("No habits yet.")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => {
            const Icon = budgetCategoryIcon(stat.icon);
            return (
              <div key={stat.habitId} className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${budgetCategoryColorClass(stat.color)}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="truncate text-sm font-semibold text-neutral-800">{stat.name}</span>
                </div>

                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 font-medium text-amber-600">
                    <Flame className="h-4 w-4" /> {stat.currentStreak} {t("day streak")}
                  </span>
                  <span className="text-neutral-500">
                    {stat.last30DaysCompleted}/30 {t("days")}
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full bg-brand-primary" style={{ width: `${Math.min(100, stat.completionRate)}%` }} />
                </div>
                <p className="mt-1.5 text-right text-xs text-neutral-400">{stat.completionRate}% {t("completion")}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
