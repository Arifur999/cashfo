"use client";

import { Flame } from "lucide-react";
import Card from "@/components/smartly/Card";
import type { BooksOverview } from "@/lib/customer/api";
import { dayOf, WEEKDAY_SHORT } from "@/lib/customer/habitDisplay";
import { weekPages } from "@/lib/customer/libraryDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface ReadingStreakCardProps {
  reading: BooksOverview["reading"];
  today: string;
}

// The tallest bar, as the board draws it.
const BAR_MAX = 86;

// The board's reading streak: days in a row, this week's pages and the daily
// average, then a bar for each day of the week (Saturday first).
export function ReadingStreakCard({ reading, today }: ReadingStreakCardProps) {
  const { t } = useLocale();
  const { total, average } = weekPages(reading.week, today);
  const most = Math.max(0, ...reading.week.map((day) => day.pages));
  const days = (n: number) => `${n} ${t(n === 1 ? "day" : "days")}`;
  const pages = (n: number) => `${n} ${t("pages")}`;

  return (
    <Card padding="none" className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title font-semibold text-ink">{t("Reading streak")}</h2>
        <span className="text-small text-ink-muted">{t("Best: {days}", { days: days(reading.best) })}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-0.5 rounded-md bg-pillar-loans-soft p-3">
          <span className="text-caption text-pillar-loans">{t("In a row")}</span>
          <span className="flex items-center gap-1 text-h3 font-bold text-ink">
            <Flame className="size-4 shrink-0 text-pillar-loans" aria-hidden="true" />
            {days(reading.streak)}
          </span>
        </div>
        {[
          { label: "This week", value: pages(total) },
          { label: "Daily average", value: pages(average) },
        ].map((tile) => (
          <div key={tile.label} className="flex flex-col gap-0.5 rounded-md bg-strip p-3">
            <span className="text-caption text-ink-muted">{t(tile.label)}</span>
            <span className="text-h3 font-bold text-ink tabular-nums">{tile.value}</span>
          </div>
        ))}
      </div>
      <div role="img" aria-label={t("Pages read each day this week")} className="flex h-30 items-end justify-between gap-3 border-b border-line px-1">
        {reading.week.map((day) => (
          <span key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className={cn("text-caption font-bold tabular-nums", day.pages ? "text-ink-2" : "text-ink-muted")}>{day.pages}</span>
            {/* The other days are the board's lighter loans orange: the night
                palette's loans colour, as no light token carries it. */}
            <span
              className={cn("w-full max-w-8.5 rounded-t-[5px]", !day.pages ? "bg-surface-sunken" : day.date === today ? "bg-pillar-loans" : "bg-night-loans dark:bg-pillar-loans/45")}
              style={{ height: `${Math.max(3, most ? Math.round((day.pages / most) * BAR_MAX) : 0)}px` }}
            />
          </span>
        ))}
      </div>
      <div className="-mt-2 flex justify-between gap-3 px-1">
        {reading.week.map((day) => (
          <span key={day.date} className={cn("flex-1 text-center text-caption", day.date === today ? "font-bold text-ink" : "font-medium text-ink-muted")}>
            {day.date === today ? t("Today") : t(WEEKDAY_SHORT[dayOf(day.date).getUTCDay()])}
          </span>
        ))}
      </div>
    </Card>
  );
}
