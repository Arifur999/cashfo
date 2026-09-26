"use client";

import { MoonStar } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// The side card next to the Ramadan grid: an overall progress ring, three
// headline numbers (ticks, days where EVERY habit was ticked, best day), and
// one bar per habit (highest first). Everything is derived from the same
// (optimistic) checks the grid shows, so it updates the instant a box is
// ticked.
export function RamadanSummary({ items, totalDays, checks }: { items: string[]; totalDays: number; checks: { day: number; item: string }[] }) {
  const { t } = useLocale();

  const cells = totalDays * items.length;
  const ticks = checks.length;
  const overallPct = cells > 0 ? Math.round((ticks / cells) * 100) : 0;

  const doneByDay = new Array<number>(totalDays + 1).fill(0);
  const doneByItem = new Map<string, number>();
  for (const c of checks) {
    doneByDay[c.day] += 1;
    doneByItem.set(c.item, (doneByItem.get(c.item) ?? 0) + 1);
  }

  let bestDay = 0;
  let bestCount = 0;
  let perfectDays = 0;
  for (let day = 1; day <= totalDays; day++) {
    if (doneByDay[day] > bestCount) {
      bestCount = doneByDay[day];
      bestDay = day;
    }
    if (items.length > 0 && doneByDay[day] === items.length) perfectDays += 1;
  }
  const bestPct = items.length > 0 ? Math.round((bestCount / items.length) * 100) : 0;

  const habits = items
    .map((item) => {
      const done = doneByItem.get(item) ?? 0;
      return { item, done, pct: totalDays > 0 ? Math.round((done / totalDays) * 100) : 0 };
    })
    .sort((a, b) => b.done - a.done);

  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
      {/* the three ashra colours, as a thin top edge */}
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-indigo-500" />
      <div className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <MoonStar className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-neutral-900">{t("Ramadan Summary")}</h2>
        </div>

        <div className="mb-5 flex justify-center">
          <div
            className="flex h-32 w-32 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(#f59e0b ${overallPct * 3.6}deg, rgba(148,163,184,.25) 0)` }}
          >
            <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-surface">
              <span className="text-2xl font-semibold tabular-nums text-neutral-900">{overallPct}%</span>
              <span className="text-[11px] text-neutral-400">{t("Progress")}</span>
            </div>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-neutral-50 px-2 py-2.5">
            <p className="text-[11px] text-neutral-400">{t("Tick")}</p>
            <p className="text-base font-semibold tabular-nums text-neutral-800">
              {ticks}
              <span className="text-[11px] font-normal text-neutral-400">/{cells}</span>
            </p>
          </div>
          <div className="rounded-xl bg-neutral-50 px-2 py-2.5" title={t("Days when every habit was ticked")}>
            <p className="text-[11px] text-neutral-400">{t("Perfect days")}</p>
            <p className="text-base font-semibold tabular-nums text-emerald-600">{perfectDays}</p>
          </div>
          <div className="rounded-xl bg-neutral-50 px-2 py-2.5">
            <p className="text-[11px] text-neutral-400">{t("Best day")}</p>
            <p className="text-base font-semibold tabular-nums text-amber-600">{bestDay > 0 ? `${t("Day")} ${bestDay}` : "--"}</p>
            {bestDay > 0 && <p className="text-[10px] tabular-nums text-neutral-400">{bestPct}%</p>}
          </div>
        </div>

        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{t("By habit")}</p>
        {habits.length === 0 ? (
          <p className="py-3 text-center text-sm text-neutral-400">{t("No habits yet -- add one below.")}</p>
        ) : (
          <div className="space-y-3">
            {habits.map(({ item, done, pct }) => (
              <div key={item}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate font-medium text-neutral-700" title={item}>
                    {t(item)}
                  </span>
                  <span className="shrink-0 tabular-nums text-neutral-400">
                    {done}/{totalDays} · <span className="font-semibold text-neutral-700">{pct}%</span>
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
