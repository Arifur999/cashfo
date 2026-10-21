"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import type { TodoList } from "@/lib/customer/api";
import { shiftDay, WEEKDAY_SHORT, weekdayOf } from "@/lib/customer/habitDisplay";
import { dayCount, dayCountText, listFor, STRIP_AFTER, STRIP_BEFORE, stripDays } from "@/lib/customer/todoDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface DayStripProps {
  lists: TodoList[];
  day: string;
  today: string;
}

export const dayHref = (day: string) => `/habit-tracker/todos?day=${day}`;

// Every piece of the strip is at least 64px and as tall as the tallest day
// (a Bangla count needs a little more).
const ARROW = "flex min-h-16 w-9 shrink-0 self-stretch items-center justify-center rounded-md border border-line bg-surface text-ink-2 hover:border-line-strong";

// Nine days around the one picked, each with how its list stands, plus a
// week back, a week on, and any date at all.
export function DayStrip({ lists, day, today }: DayStripProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const picker = useRef<HTMLInputElement>(null);

  function openPicker() {
    try {
      picker.current?.showPicker();
    } catch {
      // A browser without showPicker: the focused field still takes typing.
      picker.current?.focus();
    }
  }

  return (
    <nav aria-label={t("Days")} className="flex items-stretch gap-2">
      <Link href={dayHref(shiftDay(day, -(STRIP_BEFORE + STRIP_AFTER + 1)))} aria-label={t("Earlier days")} className={ARROW}>
        <ChevronLeft className="size-4.5" aria-hidden="true" />
      </Link>
      {/* Phones show four whole days and snap to them as the strip scrolls. */}
      <div className="flex min-w-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto scrollbar-none">
        {stripDays(day).map((key) => {
          const current = key === day;
          const isToday = key === today;
          const count = dayCountText(dayCount(listFor(lists, key)), t, locale);
          return (
            <Link key={key} href={dayHref(key)} aria-current={current ? "page" : undefined} className={cn("flex min-h-16 min-w-14 flex-1 snap-start flex-col items-center justify-center gap-0.5 rounded-md border py-1 transition-colors max-md:flex-none max-md:basis-[calc((100%-1.5rem)/4)]", current ? "border-emerald bg-emerald text-on-action shadow-button" : "border-line bg-surface text-ink hover:border-line-strong")}>
              <span className="text-caption font-semibold opacity-85">{isToday ? t("Today") : t(WEEKDAY_SHORT[weekdayOf(key)])}</span>
              <span className="text-h3 leading-none font-bold tabular-nums">{formatCount(Number(key.slice(8)), locale)}</span>
              <span className={cn("min-h-4 max-w-full truncate px-0.5 text-caption font-semibold", current ? "text-on-action" : "text-ink-muted")}>{count}</span>
            </Link>
          );
        })}
      </div>
      <Link href={dayHref(shiftDay(day, STRIP_BEFORE + STRIP_AFTER + 1))} aria-label={t("Later days")} className={ARROW}>
        <ChevronRight className="size-4.5" aria-hidden="true" />
      </Link>
      <button type="button" onClick={openPicker} className="relative hidden min-h-16 shrink-0 self-stretch flex-col items-center justify-center gap-1 rounded-md border border-line bg-surface px-4 text-small font-semibold text-ink hover:border-line-strong md:flex">
        <CalendarDays className="size-4.5" aria-hidden="true" />
        {t("Pick a date")}
        <input ref={picker} type="date" value={day} onChange={(event) => event.target.value && router.push(dayHref(event.target.value))} aria-label={t("Pick a date")} className="sr-only" tabIndex={-1} />
      </button>
    </nav>
  );
}
