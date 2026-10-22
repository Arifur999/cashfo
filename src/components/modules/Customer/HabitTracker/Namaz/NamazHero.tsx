"use client";

import { Check, CheckCheck, Clock3, MapPin, RefreshCw, Sunrise, Timer, X } from "lucide-react";
import { useState } from "react";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";
import { useMinuteClock } from "@/hooks/useMinuteClock";
import type { HabitMonthTracker, PrayerStatus } from "@/lib/customer/api";
import { timeLabel } from "@/lib/customer/date";
import { shiftDay } from "@/lib/customer/habitDisplay";
import { type CellState, cellState, isPrayed } from "@/lib/customer/namazDisplay";
import { clockOf, clockParts, methodShort, minutesUntil, nextPrayer, prayerTimesFor, TIME_NAMES, type TimeName } from "@/lib/customer/prayerTimes";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PrayerStatusMenu } from "./PrayerStatusMenu";

interface NamazHeroProps {
  // This month's sheet, or null while it opens.
  current: HabitMonthTracker | null;
  today: string;
  onMark: (prayer: string, status: PrayerStatus | null) => void;
  onSettings: () => void;
  // This month's sheet could not be opened: say so, with a retry.
  openFailed?: boolean;
  onRetry?: () => void;
}

const MARKED: Partial<Record<CellState, { word: string; icon: React.ReactNode }>> = {
  jamaat: { word: "Jama'at", icon: <CheckCheck className="size-3.5" strokeWidth={2.5} /> },
  onTime: { word: "On time", icon: <Check className="size-3.5" strokeWidth={2.75} /> },
  qaza: { word: "Qaza", icon: <Clock3 className="size-3.5" strokeWidth={2.25} /> },
  missed: { word: "Not prayed", icon: <X className="size-3.5" strokeWidth={2.75} /> },
};

// The hero's two greens are fixed (bg-forest-depth), so the white tile of
// the next prayer keeps the brand green on it in dark mode too.
const BRAND_INK = "text-emerald dark:text-forest";

// "In 53 min", or "In 2 h 10 min".
function wait(minutes: number, t: (key: string, values?: Record<string, string | number>) => string, count: (n: number) => string): string {
  if (minutes < 60) return t("In {minutes} min", { minutes: count(minutes) });
  return t("In {hours} h {minutes} min", { hours: count(Math.floor(minutes / 60)), minutes: count(minutes % 60) });
}

// The board's Namaz hero: the next prayer with its countdown and where the
// times come from, then today's six times, each prayer marked as it went;
// a prayer opens the "how was it prayed?" menu, even before its time.
// Stacked until xl, so six tiles never squeeze into a narrow column.
export function NamazHero({ current, today, onMark, onSettings, openFailed = false, onRetry }: NamazHeroProps) {
  const { t, locale } = useLocale();
  const { settings } = usePrayerSettings();
  const now = useMinuteClock();
  const [marking, setMarking] = useState<string | null>(null);
  const count = (n: number) => formatCount(n, locale);
  const todayDay = Number(today.slice(8));
  const times = prayerTimesFor(settings, today);
  const next = now ? nextPrayer(settings, today, shiftDay(today, 1), now) : null;
  const left = next && now ? minutesUntil(next.at, now) : null;

  const time = (name: TimeName) => {
    const parts = clockParts(times[name]);
    return (
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-1">
        <span className="text-h3 font-bold tabular-nums">{toLocaleDigits(parts.clock, locale)}</span>
        <span className="text-caption font-semibold opacity-90">{t(parts.meridiem)}</span>
      </span>
    );
  };

  function tile(name: TimeName) {
    const isNext = next?.prayer === name && next.at.getTime() === times[name].getTime();
    if (name === "Sunrise") {
      return (
        <div key={name} className="flex min-w-0 flex-col gap-2 rounded-md border border-white/18 bg-white/12 p-2.5 text-white sm:p-3">
          <span className="truncate text-small font-semibold opacity-90">{t(name)}</span>
          {time(name)}
          <span className="flex items-start gap-1 text-caption font-semibold">
            <Sunrise className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            {t("Fajr ends")}
          </span>
        </div>
      );
    }
    const state: CellState = current ? cellState(current, todayDay, name) : "open";
    const marked = current?.checks.some((c) => c.day === todayDay && c.item === name) ?? false;
    const shown = marked ? MARKED[state] : undefined;
    const started = now === null || times[name] <= now;
    const status = shown ? { word: t(shown.word), icon: shown.icon } : isNext && left !== null ? { word: wait(left, t, count), icon: <Timer className="size-3.5" strokeWidth={2.25} /> } : started ? { word: t("Tap to mark"), icon: null } : { word: t("Later"), icon: <Clock3 className="size-3.5" strokeWidth={2.25} /> };
    const button = (
      <button
        key={name}
        type="button"
        // A prayer still to come reads "Later" but can be marked (joined with
        // the one before it on a journey, or a city's times a little off), as
        // on Today's card.
        disabled={!current}
        onClick={() => setMarking(name)}
        aria-haspopup="dialog"
        aria-label={`${t(name)}, ${timeLabel(clockOf(times[name]), t, locale)}, ${status.word}`}
        className={cn("flex w-full min-w-0 flex-col gap-2 rounded-md border p-2.5 text-left transition-colors disabled:cursor-default sm:p-3", isNext && !isPrayed(state) ? cn("border-white bg-white", BRAND_INK) : "border-white/18 bg-white/12 text-white enabled:hover:bg-white/20")}
      >
        <span className="truncate text-small font-semibold opacity-90">{t(name)}</span>
        {time(name)}
        <span className="flex items-start gap-1 text-caption font-semibold [&_svg]:mt-px [&_svg]:shrink-0">
          {status.icon}
          {status.word}
        </span>
      </button>
    );
    if (marking !== name || !current) return button;
    return (
      <PrayerStatusMenu
        key={name}
        open
        onOpenChange={(open) => !open && setMarking(null)}
        prayer={name}
        day={today}
        state={state}
        marked={marked}
        onPick={(picked) => {
          setMarking(null);
          onMark(name, picked);
        }}
      >
        {button}
      </PrayerStatusMenu>
    );
  }

  return (
    <section aria-labelledby="next-title" className="grid items-center gap-6 rounded-lg bg-forest-depth p-4 text-white shadow-float sm:p-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-2">
        <span id="next-title" className="text-small font-semibold opacity-85">
          {t("Next prayer")}
        </span>
        <span className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-display leading-[normal] font-bold tracking-[-0.02em]">{next ? t(next.prayer) : " "}</span>
          <span className="text-h2 font-semibold tabular-nums">{next ? timeLabel(clockOf(next.at), t, locale) : ""}</span>
        </span>
        <span className={cn("flex h-7 items-center gap-2 self-start rounded-full bg-white/18 px-3 text-small font-semibold", left === null && "invisible")}>
          <Timer className="size-4" aria-hidden="true" />
          {left !== null && (left < 60 ? t("Starts in {minutes} minutes", { minutes: count(left) }) : t("Starts in {hours} h {minutes} min", { hours: count(Math.floor(left / 60)), minutes: count(left % 60) }))}
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-2 text-small opacity-90">
          <MapPin className="size-4" aria-hidden="true" />
          {t(settings.city)} · {t("{method} method", { method: t(methodShort(settings.method)) })} · {t(settings.asrSchool === "HANAFI" ? "Hanafi Asr" : "Shafi'i Asr")} ·{" "}
          <button type="button" onClick={onSettings} className="font-semibold text-white underline pointer-coarse:min-h-11">
            {t("Change")}
          </button>
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:grid-cols-6">{TIME_NAMES.map(tile)}</div>
        {openFailed && (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small font-semibold">
            {t("Couldn't open this month's sheet")}
            {onRetry && (
              <button type="button" onClick={onRetry} className="flex min-h-11 items-center gap-1 underline">
                <RefreshCw className="size-4" aria-hidden="true" />
                {t("Try again")}
              </button>
            )}
          </span>
        )}
      </div>
    </section>
  );
}
