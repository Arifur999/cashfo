"use client";

import { Check, CheckCheck, Clock, Clock3, Flame, MapPin, RefreshCw, Sunrise, Timer, X } from "lucide-react";
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
import { actionError, shiftDay, WEEKDAY_LONG, WEEKDAY_SHORT, weekdayOf, weekOf } from "@/lib/customer/habitDisplay";
import { prayerMarks, prayerStreak, type PrayerMark } from "@/lib/customer/habitsHome";
import { createHabitTrackerAction, setHabitTrackerCheckAction } from "@/lib/customer/habitsActions";
import { type CellState, cellState, PRAYER_INITIAL, PRAYERS, trackerFor } from "@/lib/customer/namazDisplay";
import { clockOf, clockParts, minutesUntil, nextPrayer, prayerTimesFor } from "@/lib/customer/prayerTimes";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { weekStartOf } from "@/lib/i18n/formatPrefs";
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

// Today's prayers in the week grid: the next one ringed, the ones after it
// dashed, one whose time has passed unmarked dashed in the brand colour.
type GridMark = PrayerMark | "next" | "later";

// The board's grid: with jama'at the brand colour, on time its pale tint,
// qaza amber, missed rose.
const CELL: Record<GridMark, string> = {
  jamaat: "bg-emerald",
  onTime: "bg-emerald-tint",
  qaza: "bg-warning-fill/60",
  missed: "bg-expense-fill/40",
  next: "border-[1.5px] border-emerald bg-surface",
  open: "border-[1.5px] border-dashed border-emerald bg-surface",
  later: "border border-dashed border-input bg-surface",
  none: "border border-dashed border-input bg-surface",
};

const CELL_WORD: Record<GridMark, string> = { jamaat: "with jama'at", onTime: "on time", qaza: "qaza", missed: "missed", next: "next to pray", open: "still open", later: "later today", none: "not yet" };

// How a marked prayer reads on its tile: how it was prayed, in its chip.
const MARKED: Partial<Record<CellState, { word: string; chip: string; icon: React.ReactNode }>> = {
  jamaat: { word: "With jama'at", chip: "bg-emerald text-on-action", icon: <CheckCheck className="size-3.25" strokeWidth={2.5} aria-hidden="true" /> },
  onTime: { word: "On time", chip: "bg-emerald-tint text-brand-ink", icon: <Check className="size-3.25" strokeWidth={2.5} aria-hidden="true" /> },
  qaza: { word: "Qaza", chip: "bg-warning-soft text-warning", icon: <Clock3 className="size-3.25" strokeWidth={2.5} aria-hidden="true" /> },
  missed: { word: "Missed", chip: "bg-expense-soft text-expense", icon: <X className="size-3.25" strokeWidth={2.5} aria-hidden="true" /> },
};

// "In 53 min", or "In 2 h 10 min".
function waitText(minutes: number, t: (key: string, values?: Record<string, string | number>) => string, count: (n: number) => string): string {
  if (minutes < 60) return t("In {minutes} min", { minutes: count(minutes) });
  return t("In {hours} h {minutes} min", { hours: count(Math.floor(minutes / 60)), minutes: count(minutes % 60) });
}

// Today's five prayers, marked straight onto this month's Namaz sheet, with
// the next one and its countdown, the week so far and the run of full days.
// A tile opens the "how was it prayed?" menu; on a phone the first tap
// marks the prayer on time and the next one opens the menu, so a jama'at or
// qaza mark is never wiped by a tap. A prayer whose time hasn't come yet can
// still be marked (joined with the one before it on a journey, or a city's
// times a little off); on a phone its tap opens the menu, so an early mark
// is never a slip.
export function PrayersCard({ trackers, today }: PrayersCardProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const { settings } = usePrayerSettings();
  const now = useMinuteClock();
  const count = (n: number) => formatCount(n, fmt);
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
      else toast.error(actionError(result.message, "Failed to update", t, fmt));
    });
  }

  const times = prayerTimesFor(settings, today);
  const timeOf = (item: string) => timeLabel(clockOf(times[item as keyof typeof times]), t, fmt);
  // Until the clock is known (the first render) no prayer is later and
  // none is next, as the server drew it.
  const later = (item: string) => now !== null && times[item as keyof typeof times] > now;
  const next = now ? nextPrayer(settings, today, shiftDay(today, 1), now) : null;
  const minutesLeft = next && now ? minutesUntil(next.at, now) : null;
  // The next prayer when it is one of today's (after Isha it is tomorrow's Fajr).
  const nextToday = next && next.at.getTime() === times[next.prayer].getTime() ? next.prayer : null;
  const friday = weekdayOf(today) === 5;

  // "4:35 am" (or "বিকাল ৪:০৫"), wrapping its am/pm under the figure when a
  // Bangla word doesn't fit the tile. The tile's label reads the whole time.
  const clock = (item: string, className: string) => {
    const parts = clockParts(times[item as keyof typeof times]);
    return (
      <span aria-hidden="true" className={cn("flex max-w-full min-w-0 flex-wrap items-baseline gap-x-1 tabular-nums", className)}>
        <span className="whitespace-nowrap">{toLocaleDigits(parts.clock, fmt)}</span>
        <span className="whitespace-nowrap">{t(parts.meridiem)}</span>
      </span>
    );
  };
  const live = current ? trackers.map((tr) => (tr.id === current.id ? current : tr)) : trackers;
  const week = weekOf(today, fmt);
  const streak = prayerStreak(live, today);
  const stateOf = (item: string): CellState => (current ? cellState(current, todayDay, item) : "open");
  const marked = (item: string) => current?.checks.some((c) => c.day === todayDay && c.item === item) ?? false;
  const word = (item: string) => {
    const state = MARKED[stateOf(item)];
    if (marked(item) && state) return t(state.word);
    if (item === nextToday && minutesLeft !== null) return waitText(minutesLeft, t, count);
    return later(item) ? t("Later today") : t("Not yet");
  };
  const tileLabel = (item: string) => `${t(item)}, ${timeOf(item)}, ${word(item)}`;
  // Today's open prayers on the grid: the next one, the later ones, and one
  // whose time has passed unmarked.
  const gridMark = (mark: PrayerMark, item: string, day: string): GridMark => (day !== today || mark !== "open" ? mark : item === nextToday ? "next" : later(item) ? "later" : "open");

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
  const where = `${t(settings.city)} · ${t(settings.asrSchool === "HANAFI" ? "Hanafi Asr" : "Shafi'i Asr")}`;
  const sunrise = timeLabel(clockOf(times.Sunrise), t, fmt);

  return (
    <>
      <section aria-labelledby="m-prayers" className="flex flex-col gap-3.5 rounded-[14px] bg-habit-depth p-4 text-white shadow-float md:hidden">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span id="m-prayers" className="text-caption leading-[normal] font-semibold tracking-[0.04em] uppercase opacity-85">
              {t("Next prayer")}
            </span>
            {next && (
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[26px] leading-[normal] font-bold">{t(next.prayer)}</span>
                <span className="text-[17px] leading-[normal] font-semibold tabular-nums">{timeLabel(clockOf(next.at), t, fmt)}</span>
              </span>
            )}
          </div>
          {minutesLeft !== null && (
            <span className="flex h-7 shrink-0 items-center gap-1.25 rounded-full bg-white/18 px-2.5 text-[12.5px] leading-[normal] font-semibold whitespace-nowrap">
              <Timer className="size-3.25" strokeWidth={2.25} aria-hidden="true" />
              {waitText(minutesLeft, t, count)}
            </span>
          )}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {PRAYERS.map((item) => {
            const state = stateOf(item);
            const isNext = item === nextToday && !marked(item);
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
                className={cn("flex w-full min-w-0 flex-col items-center gap-1 rounded-field pt-2 pb-1.75", !current && "opacity-60", isNext ? cn("bg-white", BRAND_INK) : "bg-white/12 text-white")}
              >
                <span className={cn("flex size-6.5 items-center justify-center rounded-[7px]", state === "jamaat" ? cn("bg-white", BRAND_INK) : marked(item) ? cn("bg-white/85", state === "missed" ? "text-expense" : BRAND_INK) : isNext ? "border-[1.5px] border-dashed border-current" : "border-[1.5px] border-dashed border-white/60")}>
                  {marked(item) && (state === "jamaat" ? <CheckCheck className="size-3.5" strokeWidth={2.75} aria-hidden="true" /> : state === "missed" ? <X className="size-3.5" strokeWidth={2.75} aria-hidden="true" /> : <Check className="size-3.5" strokeWidth={2.75} aria-hidden="true" />)}
                </span>
                <span className="max-w-full truncate px-0.5 text-[11.5px] leading-[normal] font-semibold">{t(item)}</span>
                <span aria-hidden="true" className="text-[10.5px] leading-[normal] tabular-nums opacity-85">
                  {toLocaleDigits(clockParts(times[item]).clock, fmt)}
                </span>
              </button>,
            );
          })}
        </div>
        {failed ? retry : <span className="text-caption leading-[normal] font-normal opacity-90">{`${t("Tap a prayer to mark it")} · ${t(settings.city)}, ${t(settings.asrSchool === "HANAFI" ? "Hanafi Asr" : "Shafi'i Asr")}`}</span>}
      </section>

      <Card padding="none" className="flex flex-col gap-4 rounded-md px-5 pt-4.5 pb-4 max-md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <h2 className="shrink-0 text-title font-semibold text-ink">{t("Today's prayers")}</h2>
            {/* Whose times these are: the city and the Asr reckoning. */}
            <span className="flex min-w-0 items-center gap-1 text-caption text-ink-muted">
              <MapPin className="size-3.25 shrink-0" aria-hidden="true" />
              <span className="truncate">{where}</span>
            </span>
          </div>
          <Link href="/habit-tracker/habits?category=Namaz" className="shrink-0 text-small font-semibold text-emerald hover:underline">
            {t("Open Namaz")}
          </Link>
        </div>

        {failed ? (
          <ErrorState bordered={false} title={t("Couldn't open this month's sheet")} onRetry={retryOpen} className="py-2" />
        ) : (
          <div className="grid grid-cols-5 gap-2.5">
            {PRAYERS.map((item) => {
              const state = MARKED[stateOf(item)];
              const isNext = item === nextToday && !marked(item);
              const tag = isNext ? t("Next") : friday && item === "Dhuhr" ? t("Jumu'ah") : null;
              const chip = marked(item) && state ? state.chip : isNext ? cn("bg-surface", "text-emerald") : "bg-surface-sunken text-ink-muted";
              return withMenu(
                "desk",
                item,
                <button key={item} ref={tileRef("desk", item)} type="button" disabled={!current} onClick={() => setMarking({ item, where: "desk" })} aria-haspopup="dialog" aria-label={tileLabel(item)} className={cn("flex w-full min-w-0 flex-col gap-2 rounded-field border p-3 text-left transition-colors disabled:cursor-not-allowed", !current && "opacity-60", isNext ? "border-emerald bg-mint-50 shadow-[0_0_0_3px_color-mix(in_srgb,var(--emerald)_15%,transparent)]" : "border-line bg-surface hover:border-line-strong")}>
                  <span className="flex min-w-0 items-center justify-between gap-1.5">
                    <span className={cn("truncate text-small font-semibold", isNext ? "text-emerald" : "text-ink-2")}>{t(item)}</span>
                    {tag && <span className={cn("shrink-0 rounded-full px-1.5 text-[10.5px] leading-[normal] font-semibold", isNext ? "bg-emerald text-on-action" : "bg-warning-soft text-warning")}>{tag}</span>}
                  </span>
                  {clock(item, "text-[20px] leading-[normal] font-bold tracking-[-0.01em] text-ink")}
                  {/* Never wider than its tile: a long word ends in "…" rather than running into the next prayer. */}
                  <span className={cn("flex h-6.5 max-w-full min-w-0 items-center gap-1.25 self-start rounded-full px-2.25 text-caption font-semibold whitespace-nowrap [&_svg]:shrink-0", chip)}>
                    {marked(item) && state ? state.icon : isNext ? <Timer className="size-3.25" strokeWidth={2.5} aria-hidden="true" /> : <Clock className="size-3.25" strokeWidth={2.5} aria-hidden="true" />}
                    <span className="truncate">{isNext && minutesLeft !== null && minutesLeft >= 60 ? t("{hours}h {minutes}m", { hours: count(Math.floor(minutesLeft / 60)), minutes: count(minutesLeft % 60) }) : word(item)}</span>
                  </span>
                </button>,
              );
            })}
          </div>
        )}

        <div className="mt-auto grid items-end gap-x-7 gap-y-3 border-t border-divider pt-3.5 md:grid-cols-[auto_auto_minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            <span className="text-caption font-semibold text-ink-muted">{t("This week")}</span>
            <div role="img" aria-label={t("Prayer marks from {day} to today", { day: t(WEEKDAY_LONG[weekStartOf(fmt)]) })} className="flex gap-1.75">
              <div aria-hidden="true" className="flex flex-col gap-0.75 text-[10.5px] leading-3.5 font-semibold text-ink-faint">
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
                  <div key={day} className="flex w-5 shrink-0 flex-col items-center gap-0.75">
                    {marks.map((dayMark, i) => {
                      const cell = gridMark(dayMark, PRAYERS[i], day);
                      return <span key={PRAYERS[i]} title={t("{prayer} on {day}: {state}", { prayer: t(PRAYERS[i]), day: dayName, state: t(CELL_WORD[cell]) })} className={cn("size-3.5 rounded-[4px]", CELL[cell])} />;
                    })}
                    <span className={cn("text-[10.5px] leading-3.5", isToday ? "font-bold text-emerald" : "font-medium text-ink-faint")}>{t(WEEKDAY_SHORT[weekdayOf(day)])}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-[repeat(2,auto)] gap-x-3.5 gap-y-1.5 pb-5 text-caption text-ink-soft">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-emerald" />
              {t("With jama'at")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-emerald-tint" />
              {t("On time")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-warning-fill/60" />
              {t("Qaza")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-expense-fill/40" />
              {t("Missed")}
            </span>
          </div>
          <div className="flex flex-col gap-2 pb-5 text-small text-ink-soft md:items-end md:text-right">
            <span className="flex items-center gap-1.5 font-semibold text-ink">
              <Flame className={cn("size-3.75 shrink-0", streak > 0 ? "text-orange-fill" : "text-ink-muted")} aria-hidden="true" />
              {streak > 0 ? t(streak === 1 ? "All five prayed, {count} day in a row" : "All five prayed, {count} days in a row", { count: count(streak) }) : t("No full day of five yet")}
            </span>
            <span className="flex items-center gap-1.5">
              <Sunrise className="size-3.75 shrink-0 text-warning-fill" aria-hidden="true" />
              {t("Sunrise {time}, when Fajr time ends", { time: sunrise })}
            </span>
          </div>
        </div>
      </Card>
    </>
  );
}
