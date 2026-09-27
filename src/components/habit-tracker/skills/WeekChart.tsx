"use client";

import { useState } from "react";
import type { SkillWeekDay } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { DISPLAY_STACK } from "./fonts";
import { hoursText } from "./skillMath";
import { SKILL_CARD } from "./skillTheme";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Series = "HOURS" | "LESSONS";

const valueOf = (day: SkillWeekDay, series: Series) => (series === "HOURS" ? day.minutes : day.lessons);

// The last seven days as bars -- hours on the HOURS skills, or lessons on the
// LESSONS skills (two different units, so a toggle rather than one mixed bar).
// The last bar is today.
export function WeekChart({ week }: { week: SkillWeekDay[] }) {
  const { t } = useLocale();
  const hasMinutes = week.some((d) => d.minutes > 0);
  const hasLessons = week.some((d) => d.lessons > 0);
  const [picked, setPicked] = useState<Series | null>(null);
  // Until the learner picks, show whichever has activity (hours first).
  const series: Series = picked ?? (hasMinutes || !hasLessons ? "HOURS" : "LESSONS");

  const values = week.map((d) => valueOf(d, series));
  const max = Math.max(...values, 1);
  const total = values.reduce((sum, v) => sum + v, 0);
  const show = (v: number) => (series === "HOURS" ? hoursText(v) : String(v));

  return (
    <div className={`${SKILL_CARD} flex flex-col p-5`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">{t("This week")}</h2>
          <p className="text-xs text-neutral-500">
            {show(total)} {t(series === "HOURS" ? "h" : "lessons")}
          </p>
        </div>
        <div role="group" aria-label={t("This week")} className="flex gap-1.5">
          {(["HOURS", "LESSONS"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={series === s}
              onClick={() => setPicked(s)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                series === s ? "border-violet-600 bg-violet-600 text-white" : "border-violet-900/15 dark:border-violet-300/25 text-violet-800 dark:text-violet-300 hover:bg-violet-600/10"
              }`}
            >
              {t(s === "HOURS" ? "Hours" : "Lessons")}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 items-end gap-2 sm:gap-3">
        {week.map((day, i) => {
          const value = values[i];
          const isToday = i === week.length - 1;
          const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
          return (
            <div key={day.date} className={`flex min-w-0 flex-1 flex-col items-center rounded-xl px-1 pb-2 pt-1.5 ${isToday ? "bg-violet-500/10" : ""}`}>
              <span className="mb-1 h-4 text-[11px] font-semibold lining-nums tabular-nums text-neutral-500" style={{ fontFamily: DISPLAY_STACK }}>
                {value > 0 ? show(value) : ""}
              </span>
              <div className="flex h-28 w-full items-end justify-center">
                <div
                  className="w-full max-w-9 rounded-t-md bg-gradient-to-t from-violet-600 to-lime-400 transition-all duration-500"
                  style={{ height: `${value > 0 ? Math.max(8, (value / max) * 100) : 0}%` }}
                  title={value > 0 ? `${show(value)} ${t(series === "HOURS" ? "h" : "lessons")}` : undefined}
                />
              </div>
              <span
                className={`mt-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${isToday ? "bg-violet-600 text-white" : "text-neutral-400"}`}
                aria-label={isToday ? `${t(WEEKDAY_SHORT[weekday])} (${t("Today")})` : undefined}
              >
                {t(WEEKDAY_SHORT[weekday])}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
