"use client";

import { Check, CheckCheck, Clock3, Flame, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";
import Card from "@/components/smartly/Card";
import ErrorState from "@/components/smartly/ErrorState";
import { useMinuteClock } from "@/hooks/useMinuteClock";
import type { HabitMonthTracker, PrayerStatus } from "@/lib/customer/api";
import { timeLabel } from "@/lib/customer/date";
import { actionError, daysText, WEEKDAY_SHORT, weekdayOf, weekOf } from "@/lib/customer/habitDisplay";
import { prayerMarks, prayerStreak, type PrayerMark } from "@/lib/customer/habitsHome";
import { createHabitTrackerAction, setHabitTrackerCheckAction } from "@/lib/customer/habitsActions";
import { type CellState, cellState, isPrayed as prayedState, PRAYER_INITIAL, PRAYERS, trackerFor } from "@/lib/customer/namazDisplay";
import { clockOf, clockParts, prayerTimesFor } from "@/lib/customer/prayerTimes";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PrayerStatusMenu } from "../Namaz/PrayerStatusMenu";
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
  // Sunken is the card's own colour at night; the line colour keeps the days to come in view.
  none: "bg-surface-sunken/60 dark:bg-line/70",
};

// How a marked prayer reads on its tile: how it was prayed.
const MARKED: Partial<Record<CellState, { word: string; icon: React.ReactNode }>> = {
  jamaat: { word: "Jama'at", icon: <CheckCheck className="size-3" strokeWidth={3} aria-hidden="true" /> },
  onTime: { word: "On time", icon: <Check className="size-3" strokeWidth={3} aria-hidden="true" /> },
  qaza: { word: "Qaza", icon: <Clock3 className="size-3" strokeWidth={2.5} aria-hidden="true" /> },
  missed: { word: "Not prayed", icon: <X className="size-3" strokeWidth={3} aria-hidden="true" /> },
};

// Today's five prayers, marked straight onto this month's Namaz sheet, with
// the week so far and the run of full days. A tile opens the "how was it
// prayed?" menu; on a phone the first tap marks the prayer on time and the
// next one opens the menu, so a jama'at or qaza mark is never wiped by a tap.
// A prayer whose time hasn't come yet reads "Later" but can still be marked
// (joined with the one before it on a journey, or a city's times a little
// off); on a phone its tap opens the menu, so an early mark is never a slip.
export function PrayersCard({ trackers, today }: PrayersCardProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const { settings } = usePrayerSettings();
  const now = useMinuteClock();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const todayDay = Number(today.slice(8));
  const server = trackerFor(trackers, year, month);
  const [current, applyMark] = useOptimistic(server, (tracker, update: { item: string; status: PrayerStatus | null }) => (tracker ? withCheck(tracker, todayDay, update.item, update.status !== null, update.status ?? undefined) : tracker));
  const [, startTransition] = useTransition();
  // The prayer whose menu is open, and on which of the two cards (both are
  // in the page, one hidden by width), so only the one on screen opens.
  const [marking, setMarking] = useState<{ item: string; where: "phone" | "desk" } | null>(null);
  const [openFailed, setOpenFailed] = useState(false);
  const creating = useRef(false);
  // Each tile's button, by "where:item", to take the focus back when its
  // menu closes: the menu wraps the tile while open, so the button the
  // focus was on is gone, and the menu has no trigger to return it to.
  const tiles = useRef(new Map<string, HTMLButtonElement>());
  const tileRef = (where: "phone" | "desk", item: string) => (el: HTMLButtonElement | null) => {
    if (el) tiles.current.set(`${where}:${item}`, el);
    else tiles.current.delete(`${where}:${item}`);
  };

  // No sheet for this month yet: open one. Already there (the Namaz page or
  // another tab opened it at the same time) is as good as opened; a failure,
  // or no answer at all (offline), says so with a retry. Either way a
  // refresh brings in whatever sheet there is.
  const openSheet = useCallback(() => {
    if (creating.current) return;
    creating.current = true;
    createHabitTrackerAction({ category: "Namaz", month, year })
      .then((result) => result.success || /already exists/.test(result.message ?? ""))
      .catch(() => false)
      .then((opened) => {
        if (!opened) {
          creating.current = false;
          setOpenFailed(true);
        }
        router.refresh();
      });
  }, [month, year, router]);

  useEffect(() => {
    // Once the sheet is here, a later month (the page left open past the
    // 1st) can open its own.
    if (server) creating.current = false;
    else openSheet();
  }, [server, openSheet]);

  // The failure shows only while there is still no sheet.
  const failed = openFailed && !server;

  function retryOpen() {
    setOpenFailed(false);
    openSheet();
  }

  // Close the menu and put the focus back on its tile, unless a click
  // outside already moved it somewhere else.
  function closeMenu(where: "phone" | "desk", item: string) {
    setMarking(null);
    requestAnimationFrame(() => {
      const focused = document.activeElement;
      if (!focused || focused === document.body) tiles.current.get(`${where}:${item}`)?.focus();
    });
  }

  function mark(item: string, status: PrayerStatus | null) {
    if (!current) return;
    setMarking(null);
    startTransition(async () => {
      applyMark({ item, status });
      const result = await setHabitTrackerCheckAction(current.id, status ? { day: todayDay, item, checked: true, status } : { day: todayDay, item, checked: false });
      if (result.success) router.refresh();
      else toast.error(actionError(result.message, "Failed to update", t, locale));
    });
  }

  const times = prayerTimesFor(settings, today);
  // Until the clock is known (the first render) every prayer is open, as the
  // server drew it.
  const later = (item: string) => now !== null && times[item as keyof typeof times] > now;
  const timeOf = (item: string) => timeLabel(clockOf(times[item as keyof typeof times]), t, locale);
  // "4:35" with its "am" beside it, the "am" dropping under it when a Bangla
  // word doesn't fit the tile. The tile's label reads the whole time.
  const clock = (item: string, box: string, figure: string, meridiem: string) => {
    const parts = clockParts(times[item as keyof typeof times]);
    return (
      <span aria-hidden="true" className={cn("flex max-w-full min-w-0 flex-wrap items-baseline gap-x-1 tabular-nums", box)}>
        <span className={cn("whitespace-nowrap", figure)}>{toLocaleDigits(parts.clock, locale)}</span>
        <span className={cn("whitespace-nowrap", meridiem)}>{t(parts.meridiem)}</span>
      </span>
    );
  };
  const live = current ? trackers.map((tr) => (tr.id === current.id ? current : tr)) : trackers;
  const week = weekOf(today);
  const streak = prayerStreak(live, today);
  const stateOf = (item: string): CellState => (current ? cellState(current, todayDay, item) : "open");
  const isPrayed = (item: string) => prayedState(stateOf(item));
  const marked = (item: string) => current?.checks.some((c) => c.day === todayDay && c.item === item) ?? false;
  const prayedToday = PRAYERS.filter(isPrayed).length;
  const nextToMark = PRAYERS.find((item) => !isPrayed(item) && !later(item));
  const word = (item: string) => {
    const state = MARKED[stateOf(item)];
    return marked(item) && state ? t(state.word) : later(item) ? t("Later") : t("Not yet");
  };
  const tileLabel = (item: string) => `${t(item)}, ${timeOf(item)}, ${word(item)}`;

  // The menu around a tile while it is open; the tile alone otherwise.
  const withMenu = (where: "phone" | "desk", item: string, tile: React.ReactNode) =>
    marking?.item === item && marking.where === where && current ? (
      <PrayerStatusMenu
        key={item}
        open
        onOpenChange={(open) => !open && closeMenu(where, item)}
        prayer={item}
        day={today}
        state={stateOf(item)}
        marked={marked(item)}
        onPick={(status) => {
          closeMenu(where, item);
          mark(item, status);
        }}
      >
        {tile}
      </PrayerStatusMenu>
    ) : (
      tile
    );

  const retry = (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption leading-[normal] font-semibold">
      {t("Couldn't open this month's sheet")}
      <button type="button" onClick={retryOpen} className="flex min-h-11 items-center gap-1 underline">
        <RefreshCw className="size-3.5" aria-hidden="true" />
        {t("Try again")}
      </button>
    </span>
  );

  return (
    <>
      <section aria-labelledby="m-prayers" className="flex flex-col gap-4 rounded-lg bg-forest-depth p-4 text-white shadow-float md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <Link href="/habit-tracker/habits?category=Namaz" id="m-prayers" className="flex min-h-6 items-center text-caption leading-[normal] font-semibold underline-offset-2 opacity-85 hover:underline">
              {t("Today's prayers")}
            </Link>
            <span className="text-h3 leading-[normal] font-semibold">{fillNodes(t("{count} of 5 prayed"), { count: <span className="text-h1 font-bold tabular-nums">{formatCount(prayedToday, locale)}</span> })}</span>
          </div>
          {streak > 0 && (
            <span className="flex h-7 items-center gap-1 rounded-full bg-white/18 px-3 text-small font-semibold whitespace-nowrap">
              <Flame className="size-3.5" aria-hidden="true" />
              {daysText(streak, t, locale)}
            </span>
          )}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {PRAYERS.map((item) => {
            const prayed = isPrayed(item);
            const next = item === nextToMark;
            const waiting = later(item);
            return withMenu(
              "phone",
              item,
              <button
                key={item}
                ref={tileRef("phone", item)}
                type="button"
                disabled={!current}
                // The first tap marks it on time; a marked prayer, or one whose time hasn't come, opens the menu.
                onClick={() => (marked(item) || waiting ? setMarking({ item, where: "phone" }) : mark(item, "ON_TIME"))}
                aria-haspopup={marked(item) || waiting ? "dialog" : undefined}
                aria-label={tileLabel(item)}
                // A prayer still to come stays at full strength; only a sheet not yet loaded fades.
                className={cn("flex w-full flex-col items-center gap-1 rounded-md py-2", !current && "opacity-60", next ? cn("bg-white", BRAND_INK) : "bg-white/12 text-white")}
              >
                <span className={cn("flex size-6.5 items-center justify-center rounded-sm", prayed ? cn("bg-white/85", BRAND_INK) : next ? "border-[1.5px] border-dashed border-current" : "border-[1.5px] border-dashed border-white/60")}>
                  {/* A prayer whose time hasn't come shows a clock, so the tile reads as "later", not broken. */}
                  {prayed ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : waiting && <Clock3 className="size-3.5" strokeWidth={2.5} aria-hidden="true" />}
                </span>
                <span className="text-caption leading-[normal] font-semibold">{t(item)}</span>
                {clock(item, "justify-center px-0.5 text-caption leading-[normal] opacity-85", "font-medium", "")}
              </button>,
            );
          })}
        </div>
        {failed ? retry : <span className="text-caption leading-[normal] font-normal opacity-90">{t("Tap a prayer to mark it. Tap again to say how it was prayed.")}</span>}
      </section>

      <Card padding="none" className="flex flex-col gap-4 px-5 pt-5 pb-4 max-md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <h2 className="shrink-0 text-title font-semibold text-ink">{t("Today's prayers")}</h2>
            <span className="shrink-0 text-caption text-ink-muted">{t("{count} of 5 prayed", { count: formatCount(prayedToday, locale) })}</span>
            {/* Whose times these are: the city and the Asr reckoning. */}
            <span className="truncate border-l border-line pl-3 text-caption text-ink-muted max-lg:hidden">
              {t(settings.city)} · {t(settings.asrSchool === "HANAFI" ? "Hanafi Asr" : "Shafi'i Asr")}
            </span>
          </div>
          <Link href="/habit-tracker/habits?category=Namaz" className="text-small font-semibold text-emerald hover:underline">
            {t("Open Namaz")}
          </Link>
        </div>

        {failed ? (
          <ErrorState bordered={false} title={t("Couldn't open this month's sheet")} onRetry={retryOpen} className="py-2" />
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {PRAYERS.map((item) => {
              const prayed = isPrayed(item);
              const state = MARKED[stateOf(item)];
              return withMenu(
                "desk",
                item,
                <button key={item} ref={tileRef("desk", item)} type="button" disabled={!current} onClick={() => setMarking({ item, where: "desk" })} aria-haspopup="dialog" aria-label={tileLabel(item)} className={cn("flex w-full flex-col gap-2 rounded-md border p-2 text-left transition-colors disabled:cursor-not-allowed sm:p-3", !current && "opacity-60", prayed ? "border-mint-200 bg-mint-50" : "border-line bg-surface hover:border-line-strong")}>
                  <span className={cn("truncate text-small font-semibold", prayed ? "text-brand-ink" : "text-ink-2")}>{t(item)}</span>
                  {clock(item, "-mt-1 text-ink", "text-h3 font-bold", "text-caption font-semibold text-ink-muted")}
                  {/* Never wider than its tile: a long word ends in "…" rather than running into the next prayer. */}
                  <span className={cn("hidden h-6.5 max-w-full min-w-0 items-center gap-1 self-start rounded-full px-2 text-caption font-semibold whitespace-nowrap sm:flex [&_svg]:shrink-0", prayed ? "bg-emerald text-on-action" : "bg-surface-sunken text-ink-muted")}>
                    {marked(item) && state?.icon}
                    {!marked(item) && later(item) && <Clock3 className="size-3" strokeWidth={2.5} aria-hidden="true" />}
                    <span className="truncate">{word(item)}</span>
                  </span>
                  <span className={cn("flex size-6.5 items-center justify-center rounded-sm sm:hidden", prayed ? "bg-emerald text-on-action" : "border-[1.5px] border-dashed border-line-strong")}>{prayed && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}</span>
                </button>,
              );
            })}
          </div>
        )}

        <div className="mt-auto grid items-end gap-x-8 gap-y-3 border-t border-divider pt-4 md:grid-cols-[auto_auto_minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            <span className="text-caption font-semibold text-ink-muted">{t("This week")}</span>
            <div role="img" aria-label={t("Prayer marks from Saturday to today")} className="flex gap-0.5">
              <div aria-hidden="true" className="mr-1.5 flex flex-col gap-0.75 text-caption leading-3.5 font-semibold text-ink-muted">
                {PRAYERS.map((p) => (
                  <span key={p}>{t(PRAYER_INITIAL[p])}</span>
                ))}
                <span className="invisible">x</span>
              </div>
              {week.map((day) => {
                const marks = prayerMarks(live, day, today);
                const isToday = day === today;
                const dayName = isToday ? t("today") : t(WEEKDAY_SHORT[weekdayOf(day)]);
                return (
                  // One width for every day, so the squares sit on an even grid whatever the weekday's name.
                  <div key={day} className="flex w-8 shrink-0 flex-col items-center gap-0.75">
                    {marks.map((mark, i) => (
                      <span key={PRAYERS[i]} title={t("{prayer} on {day}: {state}", { prayer: t(PRAYERS[i]), day: dayName, state: t(mark === "none" ? "not yet" : mark === "open" ? "still open" : mark) })} className={cn("size-3.5 rounded-[4px]", CELL[mark])} />
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
              {streak > 0 ? t(streak === 1 ? "All five prayed, {count} day in a row" : "All five prayed, {count} days in a row", { count: formatCount(streak, locale) }) : t("No full day of five yet")}
            </span>
          </div>
        </div>
      </Card>
    </>
  );
}
