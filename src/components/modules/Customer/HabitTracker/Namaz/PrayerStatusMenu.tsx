"use client";

import { Check, CheckCheck, Clock3, X } from "lucide-react";
import Chip from "@/components/smartly/Chip";
import Kbd from "@/components/smartly/Kbd";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import type { PrayerStatus } from "@/lib/customer/api";
import { timeLabel } from "@/lib/customer/date";
import { dayText, shiftDay } from "@/lib/customer/habitDisplay";
import type { CellState } from "@/lib/customer/namazDisplay";
import { clockOf, prayerTimesFor, type TimeName } from "@/lib/customer/prayerTimes";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const OPTIONS: { status: PrayerStatus; state: CellState; title: string; sub: string; tile: string; icon: React.ReactNode }[] = [
  { status: "JAMAAT", state: "jamaat", title: "With jama'at", sub: "Prayed in congregation. Jumu'ah counts here.", tile: "bg-emerald text-on-action", icon: <CheckCheck className="size-3.75" strokeWidth={2.75} /> },
  { status: "ON_TIME", state: "onTime", title: "On time", sub: "Prayed within its time", tile: "bg-emerald-tint text-emerald", icon: <Check className="size-3.75" strokeWidth={2.75} /> },
  { status: "QAZA", state: "qaza", title: "Qaza", sub: "Prayed after its time ended", tile: "bg-warning-soft text-warning", icon: <Clock3 className="size-3.75" strokeWidth={2.75} /> },
  { status: "MISSED", state: "missed", title: "Not prayed", sub: "Adds 1 to the qaza you owe", tile: "bg-expense-soft text-expense", icon: <X className="size-3.75" strokeWidth={2.75} /> },
];

interface PrayerStatusMenuProps {
  // The cell it opens from.
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prayer: string;
  // "YYYY-MM-DD" of the cell.
  day: string;
  // How the cell reads now; a past unmarked cell reads "missed" but has no
  // mark to clear.
  state: CellState;
  marked: boolean;
  // A status, or null to clear the mark.
  onPick: (status: PrayerStatus | null) => void;
  // Extra classes for the box it opens from (the sheet rings its box).
  anchorClassName?: string;
}

// Where each prayer's time ends: the next time of the day (Isha's runs to
// the next day's Fajr).
const ENDS: Record<string, TimeName> = { Fajr: "Sunrise", Dhuhr: "Asr", Asr: "Maghrib", Maghrib: "Isha", Isha: "Fajr" };

// The board's "how was it prayed?" menu: with jama'at, on time, qaza or not
// prayed (keys 1 to 4), and Clear the mark. Each tap saves at once.
export function PrayerStatusMenu({ children, open, onOpenChange, prayer, day, state, marked, onPick, anchorClassName }: PrayerStatusMenuProps) {
  const { t, fmt } = useLocale();
  const { settings } = usePrayerSettings();
  const friday = new Date(`${day}T00:00:00.000Z`).getUTCDay() === 5;
  const title = `${t(prayer)} · ${dayText(day, fmt, "long")}`;
  // "Time: 11:49 am to 4:05 pm", from the same settings as the hero's times.
  const hours = (() => {
    const end = ENDS[prayer];
    if (!end) return null;
    const times = prayerTimesFor(settings, day);
    const until = prayer === "Isha" ? prayerTimesFor(settings, shiftDay(day, 1)).Fajr : times[end];
    return t("Time: {from} to {to}", { from: timeLabel(clockOf(times[prayer as TimeName]), t, fmt), to: timeLabel(clockOf(until), t, fmt) });
  })();

  function onKeyDown(event: React.KeyboardEvent) {
    const option = OPTIONS[Number(event.key) - 1];
    if (option) {
      event.preventDefault();
      onPick(option.status);
    }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor className={cn("flex shrink-0", anchorClassName)}>{children}</PopoverAnchor>
      <PopoverContent align="start" sideOffset={8} onKeyDown={onKeyDown} aria-label={title} className="w-79 max-w-[calc(100vw-32px)] gap-0 rounded-md border border-line bg-surface p-0 text-ink shadow-overlay ring-0">
        <div className="flex items-start justify-between gap-2.5 px-4 pt-3.5 pb-2.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-[15px] leading-[normal] font-semibold">{title}</h2>
            {hours && <span className="text-[12.5px] text-ink-muted">{hours}</span>}
          </div>
          {friday && prayer === "Dhuhr" && (
            <Chip tone="warning" size="sm" className="font-semibold">
              {t("Jumu'ah")}
            </Chip>
          )}
        </div>
        <div role="radiogroup" aria-label={t("How was {prayer} prayed?", { prayer: t(prayer) })} className="flex flex-col gap-0.5 px-2 pb-2">
          {OPTIONS.map((option, index) => {
            const on = marked && state === option.state;
            return (
              <button key={option.status} type="button" role="radio" aria-checked={on} onClick={() => onPick(option.status)} className={cn("flex min-h-11 w-full items-center gap-3 rounded-[9px] px-2.5 py-2.25 text-left transition-colors", on ? "bg-mint-50" : "hover:bg-hover")}>
                <span aria-hidden="true" className={cn("flex size-7 shrink-0 items-center justify-center rounded-[7px]", option.tile)}>
                  {option.icon}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="text-body font-semibold">{t(option.title)}</span>
                  <span className="text-caption text-ink-muted">{t(option.sub)}</span>
                </span>
                <Kbd className="rounded-[4px] px-1.5 py-px font-sans text-[11px] font-semibold text-ink-muted">{index + 1}</Kbd>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2.5 border-t border-divider px-4 py-2.5 text-[12.5px]">
          <button type="button" disabled={!marked} onClick={() => onPick(null)} className="flex min-h-8 items-center text-small font-semibold text-ink-soft hover:text-ink disabled:opacity-50 pointer-coarse:min-h-11">
            {t("Clear the mark")}
          </button>
          <span className="text-ink-muted">{t("Saved as you tap")}</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
