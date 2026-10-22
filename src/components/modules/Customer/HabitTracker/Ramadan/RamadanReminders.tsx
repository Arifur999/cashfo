"use client";

import { BellRing, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";
import Card from "@/components/smartly/Card";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { OffsetReminderRows, RAMADAN_KEYS, RAMADAN_LABEL, type ReminderBook } from "../Reminders";

// Where the city behind Sehri and Iftar is set: Namaz's prayer time settings.
const PRAYER_SETTINGS_HREF = "/habit-tracker/habits?category=Namaz";

// The Sehri and Iftar rows, each a switch and a "how early". They only go
// off on the days of Ramadan.
export function RamadanReminderRows({ book, className }: { book: ReminderBook; className?: string }) {
  const { t } = useLocale();
  const rows = RAMADAN_KEYS.map((key) => ({ key, label: t(RAMADAN_LABEL[key]) }));
  return <OffsetReminderRows kind="RAMADAN" rows={rows} book={book} className={className} />;
}

// Habits › Ramadan's reminders card, for every Ramadan to come.
export function RamadanRemindersCard({ book, className }: { book: ReminderBook; className?: string }) {
  const { t } = useLocale();
  const { settings } = usePrayerSettings();
  return (
    <Card padding="none" className={cn("flex min-w-0 flex-col gap-4 px-5 py-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-title font-semibold text-ink">
            <BellRing className="size-4.5 text-emerald" aria-hidden="true" />
            {t("Sehri and Iftar reminders")}
          </h2>
          <span className="text-small text-ink-muted">{t("Only on the days of Ramadan, worked out for {city} from your prayer time settings. Not in {city}? Set your city first.", { city: t(settings.city) })}</span>
        </div>
        <Link href={PRAYER_SETTINGS_HREF} className="flex min-h-9 shrink-0 items-center gap-2 rounded-md px-2 text-small font-semibold text-brand-ink hover:bg-surface-sunken pointer-coarse:min-h-11">
          <Settings2 className="size-4" aria-hidden="true" />
          {t("Prayer time settings")}
        </Link>
      </div>
      <RamadanReminderRows book={book} className="grid gap-x-8 gap-y-4 md:grid-cols-2" />
    </Card>
  );
}
