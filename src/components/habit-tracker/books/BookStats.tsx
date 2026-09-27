"use client";

import { BookCheck, BookMarked, BookOpen, BookOpenText, Target, type LucideIcon } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { LibraryStats } from "./bookMath";
import { BOOK_CARD, COPPER } from "./bookTheme";
import { SERIF_STACK } from "./fonts";

interface BookStatsProps {
  stats: LibraryStats;
  year: number;
  goalTarget: number | null;
  onEditGoal: () => void;
}

function Tile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className={`${BOOK_CARD} flex items-center gap-3.5 p-4`}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-600/10 text-amber-700 dark:text-amber-300">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-semibold lining-nums tabular-nums leading-none text-neutral-900" style={{ fontFamily: SERIF_STACK }}>
          {value.toLocaleString("en-US")}
        </p>
        <p className="mt-1.5 text-xs leading-snug text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

// The year's reading goal (a copper ring) beside four headline numbers.
export function BookStats({ stats, year, goalTarget, onEditGoal }: BookStatsProps) {
  const { t } = useLocale();
  const done = stats.finishedThisYear;
  const pct = goalTarget ? Math.min(100, Math.round((done / goalTarget) * 100)) : 0;
  const remaining = goalTarget ? Math.max(0, goalTarget - done) : 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <div className={`${BOOK_CARD} flex items-center gap-5 p-5`}>
        <div
          className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
          style={{ background: goalTarget ? `conic-gradient(${COPPER} ${pct * 3.6}deg, rgba(148,163,184,.25) 0)` : "rgba(148,163,184,.2)" }}
        >
          <div className="flex h-[5.5rem] w-[5.5rem] flex-col items-center justify-center rounded-full bg-surface">
            {goalTarget ? (
              <>
                <span className="text-2xl font-semibold lining-nums tabular-nums leading-none text-neutral-900" style={{ fontFamily: SERIF_STACK }}>
                  {done}
                </span>
                <span className="mt-1 text-[11px] tabular-nums text-neutral-400">/ {goalTarget}</span>
              </>
            ) : (
              <Target className="h-7 w-7 text-neutral-300" />
            )}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            {t("Reading goal")} · {year}
          </p>
          {goalTarget ? (
            <p className="mt-1 text-sm font-medium text-neutral-800">
              {remaining > 0 ? `${remaining} ${t(remaining === 1 ? "book to go" : "books to go")}` : `${t("Goal reached!")} 🎉`}
            </p>
          ) : (
            <p className="mt-1 text-sm text-neutral-500">{t("Set a goal for the year and watch it fill.")}</p>
          )}
          <button
            type="button"
            onClick={onEditGoal}
            className="mt-2.5 rounded-lg border border-amber-900/15 dark:border-amber-300/25 px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-300 transition hover:bg-amber-600/10"
          >
            {t(goalTarget ? "Change goal" : "Set goal")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Tile icon={BookCheck} label={t("Finished this year")} value={done} />
        <Tile icon={BookOpenText} label={t("Pages read")} value={stats.pagesRead} />
        <Tile icon={BookOpen} label={t("Reading now")} value={stats.reading} />
        <Tile icon={BookMarked} label={t("Want to read")} value={stats.wantToRead} />
      </div>
    </div>
  );
}
