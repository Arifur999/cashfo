"use client";

import { BellRing, Settings2 } from "lucide-react";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";
import Card from "@/components/smartly/Card";
import { timeLabel } from "@/lib/customer/date";
import { clockOf, prayerTimesFor, type TimeName } from "@/lib/customer/prayerTimes";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { NAMAZ_KEYS, OffsetReminderRows, PRAYER_LABEL, type ReminderBook } from "../Reminders";

interface PrayerRemindersCardProps {
  book: ReminderBook;
  today: string;
  // Opens the prayer time settings, where the city is picked.
  onSettings: () => void;
}

// Habits › Namaz's "Prayer reminders": a switch and a "how early" for each
// of the five prayers, worked out from the same city and method as the
// times on this page.
export function PrayerRemindersCard({ book, today, onSettings }: PrayerRemindersCardProps) {
  const { t, locale } = useLocale();
  const { settings } = usePrayerSettings();
  const times = prayerTimesFor(settings, today);
  const rows = NAMAZ_KEYS.map((key) => ({
    key,
    label: t(PRAYER_LABEL[key]),
    description: t("Today at {time}", { time: timeLabel(clockOf(times[PRAYER_LABEL[key] as TimeName]), t, locale) }),
  }));

  return (
    <Card padding="none" className="flex min-w-0 flex-col gap-4 rounded-md px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-title font-semibold text-ink">
            <BellRing className="size-4.5 text-emerald" aria-hidden="true" />
            {t("Prayer reminders")}
          </h2>
          <span className="text-small text-ink-muted">{t("Worked out for {city} from your prayer time settings. Not in {city}? Set your city first.", { city: t(settings.city) })}</span>
        </div>
        <button type="button" onClick={onSettings} className="-mx-2 flex min-h-9 shrink-0 items-center gap-1.5 rounded-sm px-2 text-small font-semibold text-emerald hover:bg-surface-sunken pointer-coarse:min-h-11">
          <Settings2 className="size-3.5" aria-hidden="true" />
          {t("Prayer time settings")}
        </button>
      </div>
      <OffsetReminderRows kind="NAMAZ" rows={rows} book={book} className="grid gap-x-8 gap-y-4 md:grid-cols-2 xl:grid-cols-3" />
    </Card>
  );
}
