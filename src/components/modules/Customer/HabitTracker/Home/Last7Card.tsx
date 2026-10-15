"use client";

import Card from "@/components/smartly/Card";
import { WEEKDAY_SHORT, weekdayOf } from "@/lib/customer/habitDisplay";
import { fullDays, pct, type DayBars } from "@/lib/customer/habitsHome";
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
  const { t } = useLocale();
  const sums = fullDays(bars);
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
              <span title={`${bar.prayed} ${t("of")} 5 ${t("prayers")}${isToday ? ` ${t("so far")}` : ""}`} className={cn("w-3 rounded-t-[3px] bg-emerald", isToday && "opacity-55")} style={{ height: height(bar.prayed, 5) }} />
              <span title={`${bar.habitsDone} ${t("of")} ${bar.habitsDue} ${t("habits")}${isToday ? ` ${t("so far")}` : ""}`} className={cn("w-3 rounded-t-[3px] bg-warning-fill", isToday && "opacity-55")} style={{ height: height(bar.habitsDone, bar.habitsDue) }} />
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
              <span className="font-medium text-ink-muted">{Number(bar.day.slice(8))}</span>
            </span>
          );
        })}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5 rounded-md bg-cream p-3">
          <span className="text-caption text-ink-muted">
            {t("Prayers")}, {sums.days} {t("full days")}
          </span>
          <span className="text-title font-bold text-ink tabular-nums">
            {sums.prayed} {t("of")} {sums.prayersDue} · {pct(sums.prayed, sums.prayersDue)}%
          </span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-md bg-cream p-3">
          <span className="text-caption text-ink-muted">
            {t("Habits")}, {sums.days} {t("full days")}
          </span>
          <span className="text-title font-bold text-ink tabular-nums">
            {sums.habitsDone} {t("of")} {sums.habitsDue} · {pct(sums.habitsDone, sums.habitsDue)}%
          </span>
        </div>
      </div>
    </Card>
  );
}
