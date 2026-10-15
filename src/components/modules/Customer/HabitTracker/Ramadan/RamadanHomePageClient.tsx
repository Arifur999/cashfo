"use client";

import { Moon, MoonStar, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import EmptyState from "@/components/smartly/EmptyState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { HabitMonthTracker } from "@/lib/customer/api";
import { formatDate } from "@/lib/customer/date";
import { nextRamadan } from "@/lib/customer/habitDisplay";
import { ramadanSummary, ramadanWindow } from "@/lib/customer/ramadanDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { RamadanSetupDialog } from "./RamadanSetupDialog";

interface RamadanHomePageClientProps {
  trackers: HabitMonthTracker[];
  today: string;
}

const STATUS_CHIP = { upcoming: "neutral", going: "mint", completed: "income" } as const;
const STATUS_LABEL = { upcoming: "Coming up", going: "Going on", completed: "Completed" } as const;

// Habits › Ramadan: when the next one begins, and a card for every Ramadan
// tracked, each opening its sheet.
export function RamadanHomePageClient({ trackers, today }: RamadanHomePageClientProps) {
  const { t } = useLocale();
  const [setupOpen, setSetupOpen] = useState(false);
  const next = nextRamadan(today);
  const nextYear = Number(next.startsOn.slice(0, 4));
  const hasNext = trackers.some((tr) => tr.year === nextYear);
  const cards = [...trackers].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={t("Habits")}
        tone="habits"
        title={t("Ramadan")}
        description={t("Every Ramadan on its own sheet: fasts, Taraweeh, Quran and whatever else you keep up.")}
        actions={
          <Button onClick={() => setSetupOpen(true)}>
            <Plus strokeWidth={2.25} />
            {t("Set up Ramadan")} {next.year}
          </Button>
        }
      />

      <div role="status" className="flex items-center gap-3 rounded-md border border-mint-200 bg-mint-50 px-4 py-3 text-body text-ink">
        <MoonStar className="size-5 shrink-0 text-emerald" aria-hidden="true" />
        <span className="flex-1">
          {next.daysToGo === 0 ? (
            <b className="font-semibold">
              {t("Ramadan")} {next.year} {t("is going on now.")}
            </b>
          ) : (
            <>
              <b className="font-semibold">
                {t("Ramadan")} {next.year} {t("begins around")} {formatDate(next.startsOn, "d MMM yyyy")}, {t("in")} {next.daysToGo} {t("days")}.
              </b>{" "}
              {t("The exact day depends on the moon, so the date can move by one day.")}
            </>
          )}
        </span>
        {!hasNext && (
          <Button variant="secondary" size="sm" onClick={() => setSetupOpen(true)}>
            {t("Set it up")}
          </Button>
        )}
      </div>

      {cards.length === 0 ? (
        <EmptyState icon={<Moon />} tone="habits" title={t("No Ramadan tracked yet")} description={t("Set one up and every day gets a row for Roza, with more rows for whatever you keep up.")} action={<Button onClick={() => setSetupOpen(true)}>{t("Set up Ramadan")}</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((tracker) => {
            const window = ramadanWindow(tracker, today);
            const summary = ramadanSummary(tracker, window);
            const fasts = summary.items.find((i) => i.item === "Roza");
            return (
              <Link key={tracker.id} href={`/habit-tracker/habits/ramadan/${tracker.id}`} className={cn("flex flex-col gap-3 rounded-lg border bg-surface px-5 py-4 text-ink shadow-card transition-colors hover:border-line-strong", window.status === "going" ? "border-emerald" : "border-line")}>
                <span className="flex items-start justify-between gap-2">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-title font-semibold">
                      {t("Ramadan")} {window.hijriYear ?? tracker.year}
                    </span>
                    <span className="text-caption font-normal text-ink-muted">{window.start && window.end ? `${formatDate(window.start, "d MMM")} – ${formatDate(window.end, "d MMM yyyy")} · ${tracker.totalDays} ${t("days")}` : `${tracker.year} · ${tracker.totalDays} ${t("days")}`}</span>
                  </span>
                  <Chip tone={STATUS_CHIP[window.status]} size="sm">
                    {t(STATUS_LABEL[window.status])}
                  </Chip>
                </span>
                <span className="flex items-baseline justify-between">
                  <span className="text-[22px] leading-7 font-bold tabular-nums">{summary.pct}%</span>
                  <span className="text-small text-ink-2 tabular-nums">
                    {summary.done} {t("of")} {summary.of} {t("done")}
                  </span>
                </span>
                <span className="block h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                  <span className="block h-full rounded-full bg-emerald" style={{ width: `${summary.pct}%` }} />
                </span>
                <span className="flex justify-between text-caption font-normal text-ink-muted">
                  <span>{fasts ? `${fasts.done} ${t("of")} ${fasts.of} ${t("fasts")}` : `${tracker.items.length} ${t("rows")}`}</span>
                  <span>
                    {tracker.items.length} {t(tracker.items.length === 1 ? "row" : "rows")}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <RamadanSetupDialog open={setupOpen} onClose={() => setSetupOpen(false)} existing={trackers} defaultYear={nextYear} />
    </PageFrame>
  );
}
