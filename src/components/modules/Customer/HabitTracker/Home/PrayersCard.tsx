"use client";

import { Check, Flame } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { toast } from "sonner";
import Card from "@/components/smartly/Card";
import type { HabitMonthTracker } from "@/lib/customer/api";
import { WEEKDAY_SHORT, weekdayOf, weekOf } from "@/lib/customer/habitDisplay";
import { prayerMarks, prayerStreak, type PrayerMark } from "@/lib/customer/habitsHome";
import { createHabitTrackerAction, setHabitTrackerCheckAction } from "@/lib/customer/habitsActions";
import { cellState, isPrayed as prayedState, PRAYERS, trackerFor } from "@/lib/customer/namazDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { withCheck } from "../trackerChecks";

interface PrayersCardProps {
  trackers: HabitMonthTracker[];
  today: string;
}

// The green card keeps its colours in dark mode, so what sits on its white
// tiles keeps the brand green too (emerald turns light in dark mode).
const BRAND_INK = "text-emerald dark:text-forest";

const CELL: Record<PrayerMark, string> = {
  prayed: "bg-emerald",
  missed: "bg-expense-soft",
  open: "border-[1.5px] border-dashed border-emerald bg-surface",
  none: "bg-surface-sunken/60",
};

// Today's five prayers, tapped straight onto this month's Namaz sheet, with
// the week so far and the run of full days. Phones get the board's green
// card instead; it names the next prayer by its time on the board, which
// Smartly doesn't keep, so it counts the day's prayers and lights the next
// one still to mark.
export function PrayersCard({ trackers, today }: PrayersCardProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [year, month] = today.split("-").map(Number);
  const todayDay = Number(today.slice(8));
  const server = trackerFor(trackers, year, month);
  const [current, applyCheck] = useOptimistic(server, (tracker, update: { item: string; checked: boolean }) => (tracker ? withCheck(tracker, todayDay, update.item, update.checked) : tracker));
  const [, startTransition] = useTransition();
  const creating = useRef(false);

  // No sheet for this month yet: open one, once.
  useEffect(() => {
    if (server || creating.current) return;
    creating.current = true;
    createHabitTrackerAction({ category: "Namaz", month, year }).then((result) => {
      if (result.success) router.refresh();
      else toast.error(result.message ?? t("Could not open this month's sheet"));
    });
  }, [server, month, year, router, t]);

  function toggle(item: string, checked: boolean) {
    if (!current) return;
    startTransition(async () => {
      applyCheck({ item, checked });
      const result = await setHabitTrackerCheckAction(current.id, { day: todayDay, item, checked });
      if (result.success) router.refresh();
      else toast.error(result.message ?? t("Failed to update"));
    });
  }

  const live = current ? trackers.map((tr) => (tr.id === current.id ? current : tr)) : trackers;
  const week = weekOf(today);
  const streak = prayerStreak(live, today);
  const isPrayed = (item: string) => (current ? prayedState(cellState(current, todayDay, item)) : false);
  const prayedToday = PRAYERS.filter(isPrayed).length;
  const nextToMark = PRAYERS.find((item) => !isPrayed(item));

  return (
    <>
      <section aria-labelledby="m-prayers" className="flex flex-col gap-4 rounded-lg bg-forest-depth p-4 text-white shadow-[0_8px_20px_rgba(31,122,90,0.25)] md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span id="m-prayers" className="text-caption leading-[normal] font-semibold opacity-85">
              {t("Today's prayers")}
            </span>
            <span className="flex items-baseline gap-2">
              <span className="text-[28px] leading-[normal] font-bold tabular-nums">
                {prayedToday} {t("of")} 5
              </span>
              <span className="text-h3 leading-[normal] font-semibold">{t("prayed")}</span>
            </span>
          </div>
          {streak > 0 && (
            <span className="flex h-7 items-center gap-1 rounded-full bg-white/18 px-3 text-small font-semibold whitespace-nowrap">
              <Flame className="size-3.5" aria-hidden="true" />
              {streak} {t(streak === 1 ? "day" : "days")}
            </span>
          )}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {PRAYERS.map((item) => {
            const prayed = isPrayed(item);
            const next = item === nextToMark;
            return (
              <button
                key={item}
                type="button"
                disabled={!current}
                onClick={() => toggle(item, !prayed)}
                aria-pressed={prayed}
                aria-label={`${t(item)}, ${t(prayed ? "prayed" : "not marked yet")}`}
                className={cn("flex flex-col items-center gap-1 rounded-md py-2", next ? cn("bg-white", BRAND_INK) : "bg-white/12 text-white")}
              >
                <span className={cn("flex size-6.5 items-center justify-center rounded-sm", prayed ? cn("bg-white/85", BRAND_INK) : next ? "border-[1.5px] border-dashed border-current" : "border-[1.5px] border-dashed border-white/60")}>
                  {prayed && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
                </span>
                <span className="text-caption leading-[normal] font-semibold">{t(item)}</span>
              </button>
            );
          })}
        </div>
        <span className="text-caption leading-[normal] font-normal opacity-90">{t("Tap a prayer to mark it")}</span>
      </section>

      <Card padding="none" className="flex flex-col gap-4 px-5 pt-5 pb-4 max-md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-title font-semibold text-ink">{t("Today's prayers")}</h2>
            <span className="text-caption text-ink-muted">
              {prayedToday} {t("of")} 5 {t("prayed")}
            </span>
          </div>
          <Link href="/habit-tracker/habits?category=Namaz" className="text-small font-semibold text-emerald hover:underline">
            {t("Open Namaz")}
          </Link>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {PRAYERS.map((item) => {
            const prayed = isPrayed(item);
            return (
              <button key={item} type="button" disabled={!current} onClick={() => toggle(item, !prayed)} aria-pressed={prayed} aria-label={`${t(item)}, ${t(prayed ? "prayed" : "not marked yet")}`} className={cn("flex flex-col gap-2 rounded-md border p-2 text-left transition-colors sm:p-3", prayed ? "border-mint-200 bg-mint-50" : "border-line bg-surface hover:border-line-strong")}>
                <span className={cn("truncate text-small font-semibold", prayed ? "text-emerald" : "text-ink-2")}>{t(item)}</span>
                <span className={cn("hidden h-6.5 items-center gap-1 self-start rounded-full px-2 text-caption font-semibold whitespace-nowrap sm:flex", prayed ? "bg-emerald text-white" : "bg-surface-sunken text-ink-muted")}>
                  {prayed && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
                  {t(prayed ? "Prayed" : "Not yet")}
                </span>
                <span className={cn("flex size-6.5 items-center justify-center rounded-sm sm:hidden", prayed ? "bg-emerald text-white" : "border-[1.5px] border-dashed border-line-strong")}>{prayed && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto grid items-end gap-x-8 gap-y-3 border-t border-surface-sunken pt-4 md:grid-cols-[auto_auto_minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            <span className="text-caption font-semibold text-ink-muted">{t("This week")}</span>
            <div role="img" aria-label={t("Prayer marks from Saturday to today")} className="flex gap-2">
              <div aria-hidden="true" className="flex flex-col gap-0.75 text-caption leading-3.5 font-semibold text-ink-muted">
                {PRAYERS.map((p) => (
                  <span key={p}>{t(p).charAt(0)}</span>
                ))}
                <span className="invisible">x</span>
              </div>
              {week.map((day) => {
                const marks = prayerMarks(live, day, today);
                const isToday = day === today;
                return (
                  <div key={day} className="flex flex-col items-center gap-0.75">
                    {marks.map((mark, i) => (
                      <span key={PRAYERS[i]} title={`${t(PRAYERS[i])}, ${isToday ? t("today") : t(WEEKDAY_SHORT[weekdayOf(day)])}: ${t(mark === "none" ? "not yet" : mark === "open" ? "still open" : mark)}`} className={cn("size-3.5 rounded-[4px]", CELL[mark])} />
                    ))}
                    <span className={cn("text-caption leading-3.5", isToday ? "font-bold text-emerald" : "font-medium text-ink-muted")}>{t(WEEKDAY_SHORT[weekdayOf(day)])}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 pb-5 text-caption text-ink-2 md:grid-cols-1">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-[3px] bg-emerald" />
              {t("Prayed")}
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-[3px] bg-expense-soft" />
              {t("Missed")}
            </span>
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-[3px] border-[1.5px] border-dashed border-emerald" />
              {t("Still open")}
            </span>
          </div>
          <div className="flex flex-col gap-2 pb-5 text-small text-ink-2 md:items-end md:text-right">
            <span className="flex items-center gap-2 font-semibold text-ink">
              <Flame className={cn("size-4", streak > 0 ? "text-warning" : "text-ink-muted")} aria-hidden="true" />
              {streak > 0 ? `${t("All five prayed")}, ${streak} ${t(streak === 1 ? "day in a row" : "days in a row")}` : t("No full day of five yet")}
            </span>
          </div>
        </div>
      </Card>
    </>
  );
}
