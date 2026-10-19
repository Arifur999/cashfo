"use client";

import { Check, CheckCheck, Clock3, MapPin, Sunrise, Timer, X } from "lucide-react";
import { useState } from "react";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";
import { useMinuteClock } from "@/hooks/useMinuteClock";
import type { HabitMonthTracker, PrayerStatus } from "@/lib/customer/api";
import { timeLabel } from "@/lib/customer/date";
import { shiftDay } from "@/lib/customer/habitDisplay";
import { type CellState, cellState, isPrayed } from "@/lib/customer/namazDisplay";
import { clockOf, methodShort, minutesUntil, nextPrayer, prayerTimesFor, TIME_NAMES, type TimeName } from "@/lib/customer/prayerTimes";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PrayerStatusMenu } from "./PrayerStatusMenu";

interface NamazHeroProps {
  // This month's sheet, or null while it opens.
  current: HabitMonthTracker | null;
  today: string;
  onMark: (prayer: string, status: PrayerStatus | null) => void;
  onSettings: () => void;
}

const MARKED: Partial<Record<CellState, { word: string; icon: React.ReactNode }>> = {
  jamaat: { word: "Jama'at", icon: <CheckCheck className="size-3.5" strokeWidth={2.5} /> },
  onTime: { word: "On time", icon: <Check className="size-3.5" strokeWidth={2.75} /> },
  qaza: { word: "Qaza", icon: <Clock3 className="size-3.5" strokeWidth={2.25} /> },
  missed: { word: "Not prayed", icon: <X className="size-3.5" strokeWidth={2.75} /> },
};

// "In 53 min", or "In 2 h 10 min".
function wait(minutes: number, t: (key: string, values?: Record<string, string | number>) => string): string {
  if (minutes < 60) return t("In {minutes} min", { minutes });
  return t("In {hours} h {minutes} min", { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
}

// The board's Namaz hero: the next prayer with its countdown and where the
// times come from, then today's six times, each prayer marked as it went;
// a prayer opens the "how was it prayed?" menu.
export function NamazHero({ current, today, onMark, onSettings }: NamazHeroProps) {
  const { t } = useLocale();
  const { settings } = usePrayerSettings();
  const now = useMinuteClock();
  const [marking, setMarking] = useState<string | null>(null);
  const todayDay = Number(today.slice(8));
  const times = prayerTimesFor(settings, today);
  const next = now ? nextPrayer(settings, today, shiftDay(today, 1), now) : null;
  const left = next && now ? minutesUntil(next.at, now) : null;

  function tile(name: TimeName) {
    const isNext = next?.prayer === name && next.at.getTime() === times[name].getTime();
    if (name === "Sunrise") {
      return (
        <div key={name} className="flex flex-col gap-2 rounded-md border border-white/18 bg-white/12 p-3 text-white">
          <span className="text-small font-semibold opacity-90">{t(name)}</span>
          <span className="text-h3 font-bold whitespace-nowrap tabular-nums">{timeLabel(clockOf(times[name]), t)}</span>
          <span className="flex items-center gap-1 text-caption font-semibold whitespace-nowrap">
            <Sunrise className="size-3.5" aria-hidden="true" />
            {t("Fajr ends")}
          </span>
        </div>
      );
    }
    const state: CellState = current ? cellState(current, todayDay, name) : "open";
    const marked = MARKED[state];
    const started = now !== null && times[name] <= now;
    const status = marked ? { word: t(marked.word), icon: marked.icon } : isNext && left !== null ? { word: wait(left, t), icon: <Timer className="size-3.5" strokeWidth={2.25} /> } : started ? { word: t("Tap to mark"), icon: null } : { word: t("Later"), icon: <Clock3 className="size-3.5" strokeWidth={2.25} /> };
    const button = (
      <button
        key={name}
        type="button"
        disabled={!current}
        onClick={() => setMarking(name)}
        aria-haspopup="dialog"
        aria-label={`${t(name)}, ${timeLabel(clockOf(times[name]), t)}, ${status.word}`}
        className={cn("flex w-full flex-col gap-2 rounded-md border p-3 text-left transition-colors", isNext && !isPrayed(state) ? "border-white bg-white text-emerald" : "border-white/18 bg-white/12 text-white hover:bg-white/20")}
      >
        <span className="text-small font-semibold opacity-90">{t(name)}</span>
        <span className="text-h3 font-bold whitespace-nowrap tabular-nums">{timeLabel(clockOf(times[name]), t)}</span>
        <span className="flex items-center gap-1 text-caption font-semibold whitespace-nowrap [&_svg]:shrink-0">
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
        marked={current.checks.some((c) => c.day === todayDay && c.item === name)}
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
    <section aria-labelledby="next-title" className="grid items-center gap-6 rounded-lg bg-[linear-gradient(135deg,var(--forest)_0%,var(--emerald)_100%)] p-6 text-white shadow-[0_8px_24px_rgba(31,122,90,0.25)] lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <span id="next-title" className="text-small font-semibold opacity-85">
          {t("Next prayer")}
        </span>
        <span className="flex items-baseline gap-3">
          <span className="text-display font-bold tracking-[-0.02em]">{next ? t(next.prayer) : " "}</span>
          <span className="text-h2 font-semibold tabular-nums">{next ? timeLabel(clockOf(next.at), t) : ""}</span>
        </span>
        <span className={cn("flex h-7 items-center gap-2 self-start rounded-full bg-white/18 px-3 text-small font-semibold", left === null && "invisible")}>
          <Timer className="size-4" aria-hidden="true" />
          {left !== null && (left < 60 ? t("Starts in {minutes} minutes", { minutes: left }) : t("Starts in {hours} h {minutes} min", { hours: Math.floor(left / 60), minutes: left % 60 }))}
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-2 text-small opacity-90">
          <MapPin className="size-4" aria-hidden="true" />
          {t(settings.city)} · {t("{method} method", { method: t(methodShort(settings.method)) })} · {t(settings.asrSchool === "HANAFI" ? "Hanafi Asr" : "Shafi'i Asr")} ·{" "}
          <button type="button" onClick={onSettings} className="font-semibold text-white underline-offset-2 hover:underline">
            {t("Change")}
          </button>
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">{TIME_NAMES.map(tile)}</div>
    </section>
  );
}
