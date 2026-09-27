"use client";

import { CheckCheck, Flame, Rocket, Target, Timer, type LucideIcon } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { DISPLAY_STACK } from "./fonts";
import { hoursText, type SkillStats as Stats } from "./skillMath";
import { RING_COLOR, SKILL_CARD, SKILL_OUTLINE_BTN } from "./skillTheme";

// The year's goal -- "complete N skills" -- as a violet ring.
export function GoalCard({ completedThisYear, year, goalTarget, onEditGoal }: { completedThisYear: number; year: number; goalTarget: number | null; onEditGoal: () => void }) {
  const { t } = useLocale();
  const pct = goalTarget ? Math.min(100, Math.round((completedThisYear / goalTarget) * 100)) : 0;
  const remaining = goalTarget ? Math.max(0, goalTarget - completedThisYear) : 0;

  return (
    <div className={`${SKILL_CARD} flex items-center gap-5 p-5`}>
      <div
        className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
        style={{ background: goalTarget ? `conic-gradient(${RING_COLOR} ${pct * 3.6}deg, rgba(148,163,184,.25) 0)` : "rgba(148,163,184,.2)" }}
      >
        <div className="flex h-[5.5rem] w-[5.5rem] flex-col items-center justify-center rounded-full bg-surface">
          {goalTarget ? (
            <>
              <span className="text-2xl font-semibold lining-nums tabular-nums leading-none text-neutral-900" style={{ fontFamily: DISPLAY_STACK }}>
                {completedThisYear}
              </span>
              <span className="mt-1 text-[11px] tabular-nums text-neutral-400">/ {goalTarget}</span>
            </>
          ) : (
            <Target className="h-7 w-7 text-neutral-300" />
          )}
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
          {t("Skills goal")} · {year}
        </p>
        {goalTarget ? (
          <p className="mt-1 text-sm font-medium text-neutral-800">
            {remaining > 0 ? `${remaining} ${t(remaining === 1 ? "skill to go" : "skills to go")}` : `${t("Goal reached!")} 🎉`}
          </p>
        ) : (
          <p className="mt-1 text-sm text-neutral-500">{t("Set a goal for the year and watch it fill.")}</p>
        )}
        <button type="button" onClick={onEditGoal} className={`${SKILL_OUTLINE_BTN} mt-2.5`}>
          {t(goalTarget ? "Change goal" : "Set goal")}
        </button>
      </div>
    </div>
  );
}

function Tile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | number }) {
  return (
    <div className={`${SKILL_CARD} flex items-center gap-3.5 p-4`}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600/10 text-violet-700 dark:text-violet-300">
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
export function StatTiles({ stats, streak }: { stats: Stats; streak: number }) {
  const { t } = useLocale();
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <Tile icon={Rocket} label={t("Learning now")} value={stats.learning} />
      <Tile icon={Timer} label={t("Hours logged")} value={hoursText(stats.minutesLogged)} />
      <Tile icon={CheckCheck} label={t("Lessons done")} value={stats.lessonsDone.toLocaleString("en-US")} />
      <Tile icon={Flame} label={t("Day streak")} value={streak} />
    </div>
  );
}
