"use client";

import { Moon, Sunset } from "lucide-react";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { timeLabel } from "@/lib/customer/date";
import { clockOf, prayerTimesFor } from "@/lib/customer/prayerTimes";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { ReminderBook } from "../Reminders";
import { RamadanReminderRows } from "./RamadanReminders";

interface SehriIftarCardProps {
  // The day the times are for: today during Ramadan, else the first day of
  // the Ramadan to come.
  day: string;
  // During Ramadan, which day of it today is.
  todayDay: number | null;
  // The Hijri year of the Ramadan previewed.
  year: number | null;
  // The saved reminders: when given, Sehri's and Iftar's are set here too.
  reminders?: ReminderBook;
}

// The board's Sehri and Iftar card: when Sehri ends (Fajr) and Iftar
// (Maghrib) for the person's city, from the same settings as the prayer times.
export function SehriIftarCard({ day, todayDay, year, reminders }: SehriIftarCardProps) {
  const { t, fmt } = useLocale();
  const { settings } = usePrayerSettings();
  const times = prayerTimesFor(settings, day);
  const tiles = [
    { label: "Sehri ends", icon: Moon, at: times.Fajr },
    { label: "Iftar", icon: Sunset, at: times.Maghrib },
  ];

  return (
    <Card padding="none" className="flex flex-col gap-3 rounded-md bg-[linear-gradient(160deg,var(--warning-50)_0%,var(--surface)_75%)] px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-title font-semibold text-ink">{t("Sehri and Iftar")}</h2>
        <Chip tone={todayDay !== null ? "mint" : "neutral"} size="sm" className={cn("px-2 text-[11.5px]", todayDay === null && "text-ink-soft")}>
          {todayDay !== null ? t("Today") : t("Shows in Ramadan")}
        </Chip>
      </div>
      <span className="text-small text-ink-soft">
        {todayDay !== null ? t("For {city}, day {day} of Ramadan:", { city: t(settings.city), day: formatCount(todayDay, fmt) }) : t("For your city, every day of Ramadan. A preview for the first day of Ramadan {year} in {city}:", { year: toLocaleDigits(String(year ?? ""), fmt), city: t(settings.city) })}
      </span>
      <div className="grid grid-cols-2 gap-2.5 max-[360px]:grid-cols-1">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col gap-0.75 rounded-[10px] border border-warning-line bg-surface p-3">
            <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-warning-ink">
              <tile.icon className="size-3.5 text-warning" aria-hidden="true" />
              {t(tile.label)}
            </span>
            <span className="text-[20px] leading-[normal] font-bold text-ink tabular-nums">{timeLabel(clockOf(tile.at), t, fmt)}</span>
          </div>
        ))}
      </div>
      {reminders?.available && (
        <div className="flex flex-col gap-3 border-t border-divider pt-3">
          <span className="text-small font-semibold text-ink-2">{t("Reminders in Ramadan")}</span>
          <RamadanReminderRows book={reminders} />
        </div>
      )}
      <span className="mt-auto text-caption text-ink-muted">{t("Same city and method as your prayer times. Many people stop eating a few minutes before Sehri ends.")}</span>
    </Card>
  );
}
