"use client";

import Card from "@/components/smartly/Card";
import { WEEKDAY_SHORT, weekdayOf } from "@/lib/customer/habitDisplay";
import { fullDays, pct, type DayBars } from "@/lib/customer/habitsHome";
import { formatCount } from "@/lib/i18n/digits";
import { redigit } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface Last7CardProps {
  bars: DayBars[];
  today: string;
}

// The tallest bar, in px, inside the 170px chart.
const MAX = 150;

// Prayers and habits done each day for the last seven days, as two bars a
// day, with the totals over the days that are over.
export function Last7Card({ bars, today }: Last7CardProps) {
  const { t, fmt } = useLocale();
  const count = (n: number) => formatCount(n, fmt);
  const sums = fullDays(bars);
  // The share never breaks inside, so a narrow tile drops it whole onto a
  // second line rather than leaving "7%" on its own. The count may wrap, so
  // a long Bangla count can't run past the tile.
  const share = (done: number, due: number) => (
    <span className="flex min-w-0 flex-wrap items-baseline gap-x-1 text-[15px] leading-[normal] font-bold text-ink tabular-nums">
      <span className="min-w-0">{t("{done} of {total}", { done: count(done), total: count(due) })}</span>
      <span className="whitespace-nowrap">· {count(pct(done, due))}%</span>
    </span>
  );
  const height = (done: number, due: number) => (due > 0 ? Math.max(done > 0 ? 4 : 0, Math.round((done / due) * MAX)) : 0);

  return (
    <Card padding="none" className="flex flex-col gap-3.5 rounded-md px-5 pt-4.5 pb-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title leading-[normal] font-semibold text-ink">{redigit(t("Last 7 days"), fmt)}</h2>
        <span className="flex items-center gap-3 text-caption text-ink-soft">
          <span className="flex items-center gap-1.25">
            <span className="size-2.25 rounded-[2px] bg-emerald" />
            {t("Prayers")}
          </span>
          <span className="flex items-center gap-1.25">
            <span className="size-2.25 rounded-[2px] bg-warning-fill" />
            {t("Habits")}
          </span>
        </span>
      </div>
      <div role="img" aria-label={t("Prayers and habits done each day for the last 7 days")} className="flex h-42.5 items-end justify-between border-b border-line px-1.5">
        {bars.map((bar) => {
          const isToday = bar.day === today;
          return (
            <div key={bar.day} className="flex flex-1 items-end justify-center gap-0.75">
              <span title={t(isToday ? "{count} of 5 prayers so far" : "{count} of 5 prayers", { count: count(bar.prayed) })} className={cn("w-3 rounded-t-[3px]", isToday ? "bg-emerald-tint" : "bg-emerald")} style={{ height: height(bar.prayed, 5) }} />
              <span title={t(isToday ? "{done} of {total} habits so far" : "{done} of {total} habits", { done: count(bar.habitsDone), total: count(bar.habitsDue) })} className={cn("w-3 rounded-t-[3px]", isToday ? "bg-warning-line" : "bg-warning-fill")} style={{ height: height(bar.habitsDone, bar.habitsDue) }} />
            </div>
          );
        })}
      </div>
      <div className="-mt-1.5 flex justify-between px-1.5">
        {bars.map((bar) => {
          const isToday = bar.day === today;
          return (
            <span key={bar.day} className={cn("flex flex-1 flex-col items-center gap-px text-[11.5px] leading-[normal]", isToday ? "font-bold text-emerald" : "font-medium text-ink-muted")}>
              <span>{isToday ? t("Today") : t(WEEKDAY_SHORT[weekdayOf(bar.day)])}</span>
              <span className="text-[11px] font-medium text-ink-faint">{count(Number(bar.day.slice(8)))}</span>
            </span>
          );
        })}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-0.5 rounded-field bg-strip px-3 py-2.5">
          <span className="text-caption text-ink-muted">{t("Prayers, {count} full days", { count: count(sums.days) })}</span>
          {share(sums.prayed, sums.prayersDue)}
        </div>
        <div className="flex flex-col gap-0.5 rounded-field bg-strip px-3 py-2.5">
          <span className="text-caption text-ink-muted">{t("Habits, {count} full days", { count: count(sums.days) })}</span>
          {share(sums.habitsDone, sums.habitsDue)}
        </div>
      </div>
    </Card>
  );
}
