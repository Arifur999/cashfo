"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { OtherWeekDay } from "@/lib/otherWeek";
import { DISPLAY_STACK } from "./fonts";
import { OTHER_CARD } from "./otherTheme";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// The last seven days as bars -- % of scheduled Others habits completed that
// day. The last bar is today. Days with nothing scheduled (a rare edge case:
// every Others habit is WEEKLY_DAYS and none falls on that weekday) show an
// empty bar rather than a misleading 0%.
export function OtherWeekChart({ week }: { week: OtherWeekDay[] }) {
  const { t } = useLocale();
  const totalScheduled = week.reduce((sum, d) => sum + d.scheduled, 0);
  const totalCompleted = week.reduce((sum, d) => sum + d.completed, 0);

  return (
    <div className={`${OTHER_CARD} flex flex-col p-5`}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-neutral-900">{t("This week")}</h2>
        <p className="text-xs text-neutral-500">
          {totalCompleted} / {totalScheduled} {t("done")}
        </p>
      </div>

      <div className="flex flex-1 items-end gap-2 sm:gap-3">
        {week.map((day, i) => {
          const isToday = i === week.length - 1;
          const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
          const hasData = day.scheduled > 0;
          return (
            <div key={day.date} className={`flex min-w-0 flex-1 flex-col items-center rounded-xl px-1 pb-2 pt-1.5 ${isToday ? "bg-slate-600/10" : ""}`}>
              <span className="mb-1 h-4 text-[11px] font-semibold lining-nums tabular-nums text-neutral-500" style={{ fontFamily: DISPLAY_STACK }}>
                {hasData ? `${day.pct}%` : ""}
              </span>
              <div className="flex h-28 w-full items-end justify-center">
                <div
                  className="w-full max-w-9 rounded-t-md bg-gradient-to-t from-slate-600 to-amber-400 transition-all duration-500"
                  style={{ height: hasData ? `${Math.max(6, day.pct)}%` : "0%" }}
                  title={hasData ? `${day.completed}/${day.scheduled} (${day.pct}%)` : undefined}
                />
              </div>
              <span
                className={`mt-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${isToday ? "bg-slate-700 text-white" : "text-neutral-400"}`}
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
