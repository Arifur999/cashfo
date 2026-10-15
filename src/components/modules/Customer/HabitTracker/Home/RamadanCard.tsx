"use client";

import { MoonStar } from "lucide-react";
import Link from "next/link";
import Card from "@/components/smartly/Card";
import type { HabitMonthTracker } from "@/lib/customer/api";
import { formatDate } from "@/lib/customer/date";
import { nextRamadan } from "@/lib/customer/habitDisplay";
import { ramadanSummary, ramadanWindow } from "@/lib/customer/ramadanDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface RamadanCardProps {
  trackers: HabitMonthTracker[];
  today: string;
}

// How far off the next Ramadan is, and how the last one went.
export function RamadanCard({ trackers, today }: RamadanCardProps) {
  const { t } = useLocale();
  const next = nextRamadan(today);
  const last = [...trackers]
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    .map((tracker) => ({ tracker, window: ramadanWindow(tracker, today) }))
    .find(({ window }) => window.status === "completed");
  const summary = last ? ramadanSummary(last.tracker, last.window) : null;
  const roza = summary?.items.find((item) => item.item === "Roza") ?? summary?.items[0] ?? null;
  const quran = summary?.items.find((item) => item.item === "Quran");
  const lastLine = roza ? `${t("Last Ramadan")}: ${roza.done} ${t("of")} ${roza.of} ${t("fasts")}${quran && quran.done === quran.of && quran.of > 0 ? `, ${t("Quran every day")}` : ""}` : null;

  return (
    <Card padding="none" className="flex flex-col gap-2 bg-[linear-gradient(160deg,var(--mint-50)_0%,var(--surface)_70%)] px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title font-semibold text-ink">
          {t("Ramadan")} {next.year}
        </h2>
        <MoonStar className="size-4.5 text-emerald" aria-hidden="true" />
      </div>
      {next.daysToGo === 0 ? (
        <>
          <span className="text-h1 text-emerald">{t("Now")}</span>
          <span className="text-small text-ink-2">{t("is going on now.")}</span>
        </>
      ) : (
        <>
          <span className="text-h1 text-emerald tabular-nums">
            {next.daysToGo} {t("days")}
          </span>
          <span className="text-small text-ink-2">
            {t("to go. It begins around")} {formatDate(next.startsOn, "d MMM yyyy")}, {t("depending on the moon.")}
          </span>
        </>
      )}
      <div className="mt-auto flex flex-col gap-0.75 border-t border-line pt-3 text-small text-ink-2">
        {lastLine && <span>{lastLine}</span>}
        {last ? (
          <Link href={`/habit-tracker/habits/ramadan/${last.tracker.id}`} className="font-semibold text-emerald hover:underline">
            {t("See Ramadan")} {last.window.hijriYear ?? last.tracker.year}
          </Link>
        ) : (
          <Link href="/habit-tracker/habits?category=Ramadan" className="font-semibold text-emerald hover:underline">
            {t("Open Ramadan")}
          </Link>
        )}
      </div>
    </Card>
  );
}
