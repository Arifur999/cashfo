"use client";

import { Moon, Sunset } from "lucide-react";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { timeLabel } from "@/lib/customer/date";
import { clockOf, prayerTimesFor } from "@/lib/customer/prayerTimes";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface SehriIftarCardProps {
  // The day the times are for: today during Ramadan, else the first day of
  // the Ramadan to come.
  day: string;
  // During Ramadan, which day of it today is.
  todayDay: number | null;
  // The Hijri year of the Ramadan previewed.
  year: number | null;
}

// The board's Sehri and Iftar card: when Sehri ends (Fajr) and Iftar
// (Maghrib) for the person's city, from the same settings as the prayer times.
export function SehriIftarCard({ day, todayDay, year }: SehriIftarCardProps) {
  const { t, locale } = useLocale();
  const { settings } = usePrayerSettings();
  const times = prayerTimesFor(settings, day);
  const tiles = [
    { label: "Sehri ends", icon: Moon, at: times.Fajr },
    { label: "Iftar", icon: Sunset, at: times.Maghrib },
  ];

  return (
    <Card padding="none" className="flex flex-col gap-3 bg-[linear-gradient(160deg,var(--warning-soft)_0%,var(--surface)_75%)] px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-title font-semibold text-ink">{t("Sehri and Iftar")}</h2>
        <Chip tone={todayDay !== null ? "mint" : "neutral"} size="sm">
          {todayDay !== null ? t("Today") : t("Shows in Ramadan")}
        </Chip>
      </div>
      <span className="text-small text-ink-2">
        {todayDay !== null ? t("For {city}, day {day} of Ramadan:", { city: t(settings.city), day: formatCount(todayDay, locale) }) : t("For your city, every day of Ramadan. A preview for the first day of Ramadan {year} in {city}:", { year: toLocaleDigits(String(year ?? ""), locale), city: t(settings.city) })}
      </span>
      <div className="grid grid-cols-2 gap-3 max-[360px]:grid-cols-1">
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col gap-0.75 rounded-md border border-warning-fill/40 bg-surface p-3">
            <span className="flex items-center gap-2 text-small font-semibold text-warning">
              <tile.icon className="size-4" aria-hidden="true" />
              {t(tile.label)}
            </span>
            <span className="text-h2 leading-[normal] font-bold text-ink tabular-nums">{timeLabel(clockOf(tile.at), t)}</span>
          </div>
        ))}
      </div>
      <span className="mt-auto text-caption text-ink-muted">{t("Same city and method as your prayer times. Many people stop eating a few minutes before Sehri ends.")}</span>
    </Card>
  );
}
