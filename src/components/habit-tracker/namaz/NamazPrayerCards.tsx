"use client";

import { Check } from "lucide-react";
import type { HabitMonthTracker } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { prayerStats } from "./namazStats";
import { PrayerIcon, prayerBadge } from "./PrayerIcon";

// One card per prayer: over the days that have fully passed so far, how many
// there were (Total Days), on how many the prayer was ticked (Complete) and on
// how many it wasn't (Missing), the percentage, a stacked bar and a short
// follow-up message. Laid out on the parent's @container so 5 fit in a row
// when there is room.
export function NamazPrayerCards({ tracker, ticked }: { tracker: HabitMonthTracker; ticked: Set<string> }) {
  const { t } = useLocale();
  const stats = prayerStats(tracker, ticked);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-neutral-900">{t("Prayer Summary")}</h2>
          <span className="text-xs text-neutral-400">{t("Up to today")}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-medium">
          <span className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> {t("Complete")}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-0.5 text-red-600">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> {t("Missing")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 @min-[640px]:grid-cols-2 @min-[1180px]:grid-cols-5">
        {stats.map(({ item, total, complete, missing, completePct, missingPct, todayDone, note }) => (
          <div key={item} className="rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${prayerBadge(item)}`}>
                  <PrayerIcon item={item} className="h-[18px] w-[18px]" />
                </span>
                <span className="truncate text-sm font-semibold text-neutral-800">{t(item)}</span>
              </span>
              {todayDone && (
                <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                  <Check className="h-3 w-3" /> {t("Today")}
                </span>
              )}
            </div>

            <p className="mb-2 text-3xl font-semibold tabular-nums text-neutral-900">
              {Math.round(completePct)}
              <span className="text-base font-medium text-neutral-400">%</span>
            </p>

            <div className="flex h-5 w-full overflow-hidden rounded-full bg-neutral-200/70">
              {complete > 0 && (
                <div
                  className="flex items-center justify-center bg-gradient-to-r from-sky-400 to-blue-600 text-[11px] font-semibold text-white transition-all duration-500"
                  style={{ width: `${completePct}%` }}
                >
                  {completePct >= 10 ? complete : ""}
                </div>
              )}
              {missing > 0 && (
                <div
                  className="flex items-center justify-center bg-gradient-to-r from-rose-400 to-red-500 text-[11px] font-semibold text-white transition-all duration-500"
                  style={{ width: `${missingPct}%` }}
                >
                  {missingPct >= 10 ? missing : ""}
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="min-w-0 rounded-lg bg-neutral-50 px-1 py-1.5">
                <p className="truncate text-[10px] text-neutral-400">{t("Total Days")}</p>
                <p className="text-sm font-semibold tabular-nums text-neutral-800">{total}</p>
              </div>
              <div className="min-w-0 rounded-lg bg-neutral-50 px-1 py-1.5">
                <p className="truncate text-[10px] text-neutral-400">{t("Complete")}</p>
                <p className="text-sm font-semibold tabular-nums text-blue-600">{complete}</p>
              </div>
              <div className="min-w-0 rounded-lg bg-neutral-50 px-1 py-1.5">
                <p className="truncate text-[10px] text-neutral-400">{t("Missing")}</p>
                <p className="text-sm font-semibold tabular-nums text-red-500">{missing}</p>
              </div>
            </div>

            {note && (
              <p className={`mt-3 text-xs font-medium ${note.tone}`}>
                {t(note.text)} {note.emoji}
              </p>
            )}
          </div>
        ))}
      </div>

      {tracker.todayDay !== null && <p className="mt-3 text-[11px] text-neutral-400">{t("Today counts once the day has passed.")}</p>}
    </section>
  );
}
