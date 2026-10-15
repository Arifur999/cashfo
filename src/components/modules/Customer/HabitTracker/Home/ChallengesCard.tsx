"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import Card from "@/components/smartly/Card";
import type { HabitMonthTracker } from "@/lib/customer/api";
import { challengeWindow, dayDone } from "@/lib/customer/challengeDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface ChallengesCardProps {
  trackers: HabitMonthTracker[];
  today: string;
}

const RADIUS = 17;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// The challenges going on, each as a ring of how far along it is.
export function ChallengesCard({ trackers, today }: ChallengesCardProps) {
  const { t } = useLocale();
  const going = trackers
    .map((tracker) => ({ tracker, window: challengeWindow(tracker, today) }))
    .filter(({ window }) => window.status === "going")
    .sort((a, b) => b.tracker.createdAt.localeCompare(a.tracker.createdAt))
    .slice(0, 2);

  return (
    <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title font-semibold text-ink">{t("Challenges")}</h2>
        <Link href="/habit-tracker/habits?category=Others" className="text-small font-semibold text-emerald hover:underline">
          {t("All")}
        </Link>
      </div>
      {going.length === 0 ? (
        <span className="py-3 text-small text-ink-muted">{t("Nothing going on right now")}</span>
      ) : (
        going.map(({ tracker, window }) => {
          const fill = window.today / tracker.totalDays;
          const pct = Math.round(fill * 100);
          const doneToday = dayDone(tracker, window.today);
          return (
            <div key={tracker.id} className="flex items-center gap-3">
              <span role="img" aria-label={`${pct}% ${t("of the way")}`} className="relative size-10.5 shrink-0">
                <svg viewBox="0 0 42 42" className="size-10.5 -rotate-90">
                  <circle cx="21" cy="21" r={RADIUS} className="fill-none stroke-surface-sunken" strokeWidth="4" />
                  <circle cx="21" cy="21" r={RADIUS} className="fill-none stroke-emerald" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${fill * CIRCUMFERENCE} ${CIRCUMFERENCE}`} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-caption font-bold text-ink">{pct}%</span>
              </span>
              <Link href={`/habit-tracker/habits/others/${tracker.id}`} className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-body font-semibold text-ink hover:underline">{tracker.name}</span>
                <span className="text-caption text-ink-muted">
                  {t("Day")} {window.today} {t("of")} {tracker.totalDays} · {t(doneToday ? "done today" : "not yet today")}
                </span>
              </Link>
            </div>
          );
        })
      )}
      <Link href="/habit-tracker/habits?category=Others" className="mt-auto flex items-center gap-2 border-t border-surface-sunken pt-3 text-small font-semibold text-emerald hover:underline">
        <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
        {t("Start a challenge")}
      </Link>
    </Card>
  );
}
