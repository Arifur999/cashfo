"use client";

import { CalendarCheck, Flame, ListTodo, Sparkles, type LucideIcon } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { DISPLAY_STACK } from "./fonts";
import { OTHER_CARD } from "./otherTheme";
import type { OtherOverviewStats } from "./otherStats";

function Tile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | number }) {
  return (
    <div className={`${OTHER_CARD} flex items-center gap-3.5 p-4`}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-600/10 text-slate-700 dark:text-amber-300">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-semibold lining-nums tabular-nums leading-none text-neutral-900" style={{ fontFamily: DISPLAY_STACK }}>
          {value}
        </p>
        <p className="mt-1.5 text-xs leading-snug text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

// Four headline numbers.
export function OtherStatTiles({ stats }: { stats: OtherOverviewStats }) {
  const { t } = useLocale();
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <Tile icon={ListTodo} label={t("Done today")} value={`${stats.doneToday} / ${stats.totalToday}`} />
      <Tile icon={CalendarCheck} label={t("Active habits")} value={stats.activeHabits} />
      <Tile icon={Flame} label={t("Best streak")} value={stats.bestStreak} />
      <Tile icon={Sparkles} label={t("This week")} value={`${stats.weekPct}%`} />
    </div>
  );
}
