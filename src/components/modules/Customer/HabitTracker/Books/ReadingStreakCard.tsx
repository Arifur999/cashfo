"use client";

import { Flame } from "lucide-react";
import Card from "@/components/smartly/Card";
import type { BooksOverview } from "@/lib/customer/api";
import { daysText, dayOf, WEEKDAY_SHORT } from "@/lib/customer/habitDisplay";
import { weekPages } from "@/lib/customer/libraryDisplay";
import { formatCount } from "@/lib/i18n/digits";
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
  const { t, locale } = useLocale();
  const { total, average } = weekPages(reading.week, today);
  const most = Math.max(0, ...reading.week.map((day) => day.pages));
  const days = (n: number) => daysText(n, t, locale);
  const pages = (n: number) => t("{count} pages", { count: formatCount(n, locale) });

  return (
    <Card padding="none" className="flex flex-col gap-3.5 rounded-md px-5 py-4.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title font-semibold text-ink">{t("Reading streak")}</h2>
        <span className="text-[12.5px] text-ink-muted">{t("Best: {days}", { days: days(reading.best) })}</span>
      </div>
      <div className="grid grid-cols-3 gap-2.5 max-[400px]:grid-cols-1">
        <div className="flex flex-col gap-0.5 rounded-field bg-orange-soft/50 px-3 py-2.5">
          <span className="text-caption text-orange">{t("In a row")}</span>
          <span className="flex items-center gap-1.25 text-h3 font-bold text-ink">
            <Flame className="size-3.75 shrink-0 text-orange-fill" strokeWidth={2.25} aria-hidden="true" />
            {days(reading.streak)}
          </span>
        </div>
        {[
          { label: "This week", value: pages(total) },
          { label: "Daily average", value: pages(average) },
        ].map((tile) => (
          <div key={tile.label} className="flex flex-col gap-0.5 rounded-field bg-strip px-3 py-2.5">
            <span className="text-caption text-ink-muted">{t(tile.label)}</span>
            <span className="text-h3 font-bold text-ink tabular-nums">{tile.value}</span>
          </div>
        ))}
      </div>
      <div role="img" aria-label={t("Pages read each day this week")} className="flex h-30 items-end justify-between gap-2.5 border-b border-line px-1">
        {reading.week.map((day) => (
          <span key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className={cn("text-[11.5px] font-bold tabular-nums", day.pages ? "text-ink-2" : "text-ink-faint")}>{formatCount(day.pages, locale)}</span>
            {/* Today in the board's orange, the other days in a lighter wash of it. */}
            <span
              className={cn("w-full max-w-8.5 rounded-t-[5px]", !day.pages ? "bg-line" : day.date === today ? "bg-orange-fill" : "bg-orange-fill/45")}
              style={{ height: `${Math.max(3, most ? Math.round((day.pages / most) * BAR_MAX) : 0)}px` }}
            />
          </span>
        ))}
      </div>
      <div className="-mt-2 flex justify-between gap-2.5 px-1">
        {reading.week.map((day) => (
          <span key={day.date} className={cn("flex-1 text-center text-[11.5px]", day.date === today ? "font-bold text-ink" : "font-medium text-ink-muted")}>
            {day.date === today ? t("Today") : t(WEEKDAY_SHORT[dayOf(day.date).getUTCDay()])}
          </span>
        ))}
      </div>
    </Card>
  );
}
