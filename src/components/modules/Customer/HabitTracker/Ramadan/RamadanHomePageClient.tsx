"use client";

import { Moon, MoonStar, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import EmptyState from "@/components/smartly/EmptyState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { HabitMonthTracker, Reminder } from "@/lib/customer/api";
import { daysText, dayText, nextRamadan } from "@/lib/customer/habitDisplay";
import { ramadanSummary, ramadanWindow, type SetupRange, setupYears } from "@/lib/customer/ramadanDisplay";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { useReminderBook } from "../Reminders";
import { RamadanRemindersCard } from "./RamadanReminders";
import { RamadanSetupDialog } from "./RamadanSetupDialog";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";

interface RamadanHomePageClientProps {
  trackers: HabitMonthTracker[];
  today: string;
  // Saved reminders (Sehri's and Iftar's are set here); null when they
  // couldn't be read.
  reminders: Reminder[] | null;
}

const STATUS_CHIP = { upcoming: "neutral", going: "mint", completed: "income" } as const;
const STATUS_LABEL = { upcoming: "Coming up", going: "Going on", completed: "Completed" } as const;

// Habits › Ramadan: when the next one begins, and a card for every Ramadan
// tracked, each opening its sheet.
export function RamadanHomePageClient({ trackers, today, reminders: savedReminders }: RamadanHomePageClientProps) {
  const { t, fmt } = useLocale();
  const { hijriAdjust } = usePrayerSettings().settings;
  const [setupOpen, setSetupOpen] = useState(false);
  const reminders = useReminderBook(savedReminders);
  // Which Ramadan the dialog sets up: the next one, or another one (earlier
  // or later). Kept after it closes, so its years don't change while it
  // fades out.
  const [range, setRange] = useState<SetupRange>("next");
  const next = nextRamadan(today, hijriAdjust);
  const nextYear = Number(next.startsOn.slice(0, 4));
  const hasNext = trackers.some((tr) => tr.year === nextYear);
  // The years another Ramadan can still be set up in.
  const otherYears = setupYears(trackers, nextYear, "another");
  const cards = [...trackers].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  const count = (n: number) => formatCount(n, fmt);
  const year = (value: number | null) => toLocaleDigits(String(value ?? ""), fmt);
  const nextName = t("Ramadan {year}", { year: year(next.year) });

  function openSetup(which: SetupRange) {
    setRange(which);
    setSetupOpen(true);
  }

  return (
    <PageFrame className="gap-5">
      <PageHeader
        title={t("Ramadan")}
        description={t("Every Ramadan on its own sheet: fasts, Taraweeh, Quran and whatever else you keep up.")}
        actions={
          // Once the next Ramadan has its sheet, another can still be added:
          // an earlier one (to log its fasts, or the ones to make up), as
          // Namaz adds an earlier month, or one after the next.
          !hasNext ? (
            <Button onClick={() => openSetup("next")} className="rounded-sm">
              <Plus strokeWidth={2.25} />
              {t("Set up {name}", { name: nextName })}
            </Button>
          ) : (
            otherYears.length > 0 && (
              <Button variant="secondary" onClick={() => openSetup("another")} className="rounded-sm px-3.5">
                <Plus className="text-ink-soft" />
                {t("Add another Ramadan")}
              </Button>
            )
          )
        }
      />

      {/* A note that stays as it is: no live region. */}
      <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-emerald-line bg-mint-50 px-4 py-3 text-body text-ink">
        <MoonStar className="size-4.5 shrink-0 text-emerald" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          {next.daysToGo === 0 ? (
            <b className="font-semibold">{t("{name} is going on now.", { name: nextName })}</b>
          ) : (
            <>
              <b className="font-semibold">{t(next.daysToGo === 1 ? "{name} begins around {date}, in {count} day." : "{name} begins around {date}, in {count} days.", { name: nextName, date: dayText(next.startsOn, fmt, "dayMonthYear"), count: count(next.daysToGo) })}</b> {t("The exact day depends on the moon, so the date can move by one day.")}
            </>
          )}
        </span>
        {!hasNext && (
          <Button variant="secondary" size="sm" onClick={() => openSetup("next")} className="h-8.5 rounded-sm px-3.5 pointer-coarse:h-11">
            {t("Set it up")}
          </Button>
        )}
      </div>

      {cards.length === 0 ? (
        <EmptyState icon={<Moon />} tone="habits" title={t("No Ramadan tracked yet")} description={t("Set one up and every day gets a row for Roza, with more rows for whatever you keep up.")} action={<Button onClick={() => openSetup("next")}>{t("Set up {name}", { name: nextName })}</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((tracker) => {
            const window = ramadanWindow(tracker, today, hijriAdjust);
            const summary = ramadanSummary(tracker, window);
            const fasts = summary.items.find((i) => i.item === "Roza");
            const rows = t(tracker.items.length === 1 ? "{count} row" : "{count} rows", { count: count(tracker.items.length) });
            return (
              <Link key={tracker.id} href={`/habit-tracker/habits/ramadan/${tracker.id}`} className={cn("flex flex-col gap-2.5 rounded-md border bg-surface px-4.5 py-4 text-ink shadow-card transition-colors hover:border-line-strong", window.status === "going" ? "border-emerald" : "border-line")}>
                <span className="flex items-start justify-between gap-2">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[15px] leading-[normal] font-semibold">{t("Ramadan {year}", { year: year(window.hijriYear ?? tracker.year) })}</span>
                    <span className="text-caption font-normal text-ink-muted">
                      {[window.start && window.end ? t("{from} to {to}", { from: dayText(window.start, fmt, "dayMonth"), to: dayText(window.end, fmt, "dayMonthYear") }) : year(tracker.year), daysText(tracker.totalDays, t, fmt)].join(" · ")}
                    </span>
                  </span>
                  <Chip tone={STATUS_CHIP[window.status]} size="sm">
                    {t(STATUS_LABEL[window.status])}
                  </Chip>
                </span>
                <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="text-[24px] leading-[normal] font-bold tracking-[-0.02em] tabular-nums">{count(summary.pct)}%</span>
                  <span className="text-[12.5px] text-ink-soft tabular-nums">{t("{done} of {total} done", { done: count(summary.done), total: count(summary.of) })}</span>
                </span>
                <span className="block h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                  <span className="block h-full rounded-full bg-emerald" style={{ width: `${summary.pct}%` }} />
                </span>
                <span className="flex flex-wrap justify-between gap-x-2 text-caption font-normal text-ink-muted">
                  <span>{fasts ? t("{done} of {total} fasts", { done: count(fasts.done), total: count(fasts.of) }) : rows}</span>
                  <span>{rows}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {reminders.available && <RamadanRemindersCard book={reminders} />}

      <RamadanSetupDialog open={setupOpen} onClose={() => setSetupOpen(false)} existing={trackers} defaultYear={nextYear} range={range} />
    </PageFrame>
  );
}
