"use client";

import Card from "@/components/smartly/Card";
import { WEEKDAY_SHORT, weekdayOf } from "@/lib/customer/habitDisplay";
import { fullDays, pct, type DayBars } from "@/lib/customer/habitsHome";
import { formatCount } from "@/lib/i18n/digits";
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
  const { t, locale } = useLocale();
  const count = (n: number) => formatCount(n, locale);
  const sums = fullDays(bars);
  // The share never breaks inside, so a narrow tile drops it whole onto a
  // second line rather than leaving "7%" on its own. The count may wrap, so
  // a long Bangla count can't run past the tile.
  const share = (done: number, due: number) => (
    <span className="flex min-w-0 flex-wrap items-baseline gap-x-1 text-title font-bold text-ink tabular-nums">
      <span className="min-w-0">{t("{done} of {total}", { done: count(done), total: count(due) })}</span>
      <span className="whitespace-nowrap">· {count(pct(done, due))}%</span>
    </span>
  );
  const height = (done: number, due: number) => (due > 0 ? Math.max(done > 0 ? 4 : 0, Math.round((done / due) * MAX)) : 0);

  return (
    <Card padding="none" className="flex flex-col gap-4 px-5 pt-5 pb-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title font-semibold text-ink">{t("Last 7 days")}</h2>
        <span className="flex items-center gap-3 text-caption text-ink-2">
          <span className="flex items-center gap-1">
            <span className="size-2.25 rounded-[2px] bg-emerald" />
            {t("Prayers")}
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2.25 rounded-[2px] bg-warning-fill" />
            {t("Habits")}
          </span>
        </span>
      </div>
      <div role="img" aria-label={t("Prayers and habits done each day for the last 7 days")} className="flex h-42.5 items-end justify-between border-b border-line px-2">
        {bars.map((bar) => {
          const isToday = bar.day === today;
          return (
            <div key={bar.day} className="flex flex-1 items-end justify-center gap-0.75">
              <span title={t(isToday ? "{count} of 5 prayers so far" : "{count} of 5 prayers", { count: count(bar.prayed) })} className={cn("w-3 rounded-t-[3px] bg-emerald", isToday && "opacity-55")} style={{ height: height(bar.prayed, 5) }} />
              <span title={t(isToday ? "{done} of {total} habits so far" : "{done} of {total} habits", { done: count(bar.habitsDone), total: count(bar.habitsDue) })} className={cn("w-3 rounded-t-[3px] bg-warning-fill", isToday && "opacity-55")} style={{ height: height(bar.habitsDone, bar.habitsDue) }} />
            </div>
          );
        })}
      </div>
      <div className="-mt-1.5 flex justify-between px-2">
        {bars.map((bar) => {
          const isToday = bar.day === today;
          return (
            <span key={bar.day} className={cn("flex flex-1 flex-col items-center gap-px text-caption", isToday ? "font-bold text-emerald" : "font-medium text-ink-muted")}>
              <span>{isToday ? t("Today") : t(WEEKDAY_SHORT[weekdayOf(bar.day)])}</span>
              <span className="font-medium text-ink-muted">{count(Number(bar.day.slice(8)))}</span>
            </span>
          );
        })}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5 rounded-md bg-strip p-3">
          <span className="text-caption text-ink-muted">{t("Prayers, last {count} days", { count: count(sums.days) })}</span>
          {share(sums.prayed, sums.prayersDue)}
        </div>
        <div className="flex flex-col gap-0.5 rounded-md bg-strip p-3">
          <span className="text-caption text-ink-muted">{t("Habits, last {count} days", { count: count(sums.days) })}</span>
          {share(sums.habitsDone, sums.habitsDue)}
        </div>
      </div>
    </Card>
  );
}
