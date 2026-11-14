"use client";

import { ArrowRight, LayoutDashboard, Plus, Settings2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { useMinuteClock } from "@/hooks/useMinuteClock";
import type { HabitMonthTracker, PrayerStatus, QazaSummary, Reminder } from "@/lib/customer/api";
import { actionError, hijriDate } from "@/lib/customer/habitDisplay";
import { prayerStreak } from "@/lib/customer/habitsHome";
import { prayerTimesFor } from "@/lib/customer/prayerTimes";
import { setHabitTrackerCheckAction } from "@/lib/customer/habitsActions";
import { monthName } from "@/lib/customer/insights";
import { cellState, monthSummary, PRAYERS, trackerFor } from "@/lib/customer/namazDisplay";
import { formatDay } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { useReminderBook } from "../Reminders";
import { withCheck } from "../trackerChecks";
import { EarlierMonthDialog } from "./EarlierMonthDialog";
import { NamazHero } from "./NamazHero";
import { PrayerRemindersCard } from "./PrayerRemindersCard";
import { PrayerSettingsDrawer } from "./PrayerSettingsDrawer";
import { QazaCard } from "./QazaCard";
import { TodayPrayersCard } from "./TodayPrayersCard";
import { useThisMonthSheet } from "./useThisMonthSheet";

interface NamazHomePageClientProps {
  trackers: HabitMonthTracker[];
  // null when it could not be read.
  qaza: QazaSummary | null;
  // "YYYY-MM-DD" today in the platform timezone.
  today: string;
  // Saved reminders (the prayers' are set here); null when they couldn't be read.
  reminders: Reminder[] | null;
}

const pad = (n: number) => String(n).padStart(2, "0");

// The month ring's circumference (r = 30).
const RING = 2 * Math.PI * 30;

// Worship › Namaz › Today (the NamazHome board): the next prayer, today's
// five prayers to mark, the qaza still owed, this month so far and the past
// months. The current month's sheet opens on its own.
export function NamazHomePageClient({ trackers, qaza, today, reminders: savedReminders }: NamazHomePageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const todayDay = Number(today.slice(8));
  const currentKey = today.slice(0, 7);
  const server = trackerFor(trackers, year, month);
  const [current, applyMark] = useOptimistic(server, (tracker, update: { item: string; status: PrayerStatus | null }) => (tracker ? withCheck(tracker, todayDay, update.item, update.status !== null, update.status ?? undefined) : tracker));
  const [, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings } = usePrayerSettings();
  const now = useMinuteClock();
  const reminders = useReminderBook(savedReminders);
  const count = (n: number) => formatCount(n, fmt);

  const { failed, retry: retryOpen } = useThisMonthSheet(server, year, month);

  function mark(item: string, status: PrayerStatus | null) {
    if (!current) return;
    startTransition(async () => {
      applyMark({ item, status });
      const result = await setHabitTrackerCheckAction(current.id, status ? { day: todayDay, item, checked: true, status } : { day: todayDay, item, checked: false });
      if (result.success) router.refresh();
      else toast.error(actionError(result.message, "Failed to update", t, fmt));
    });
  }

  const summary = current ? monthSummary(current) : null;
  const times = prayerTimesFor(settings, today);
  // Today's prayers whose time has come, and how many of them are prayed.
  const startedToday = now ? PRAYERS.filter((prayer) => times[prayer] <= now).length : 0;
  const prayedToday = summary?.todayDone ?? 0;
  const streak = prayerStreak(trackers, today);
  // The month so far: the days gone by, and today's prayers that have started.
  const soFarDue = (current?.elapsedDays ?? 0) * 5 + startedToday;
  const soFarPrayed = (summary?.prayed ?? 0) + prayedToday;
  const soFarPct = soFarDue > 0 ? Math.min(100, Math.round((soFarPrayed / soFarDue) * 100)) : 0;
  // Missed: the days gone by, and today's started prayers marked not prayed.
  const soFarMissed = (summary?.missed ?? 0) + (current ? PRAYERS.filter((prayer) => cellState(current, todayDay, prayer) === "missed").length : 0);
  const past = trackers.filter((tracker) => tracker.id !== current?.id).sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (b.month ?? 0) - (a.month ?? 0));
  const bestPastId = [...past].filter((tracker) => monthSummary(tracker).due > 0).sort((a, b) => monthSummary(b).pct - monthSummary(a).pct)[0]?.id;
  const monthDays = current?.totalDays ?? new Date(Date.UTC(year, month, 0)).getUTCDate();
  const chips = [
    { label: t("Today"), value: t("{done} of {total} so far", { done: count(prayedToday), total: count(Math.max(startedToday, prayedToday)) }) },
    { label: t("All-five streak"), value: streak > 0 ? t(streak === 1 ? "{count} day" : "{count} days", { count: count(streak) }) : "—" },
    { label: t("This month"), value: `${count(soFarPct)}%` },
  ];

  return (
    <PageFrame className="gap-4 md:pt-5.5">
      <PageHeader
        title={t("Namaz")}
        description={`${formatDay(today, "EEEE, d MMMM yyyy", fmt)} · ${hijriDate(today, fmt, settings.hijriAdjust)}`}
        actions={
          <>
            <Button variant="secondary" asChild className="rounded-sm px-3.5">
              <Link href="/habit-tracker/habits/namaz">
                <LayoutDashboard className="text-ink-soft" />
                {t("Dashboard")}
              </Link>
            </Button>
            <Button variant="secondary" size="icon" onClick={() => setSettingsOpen(true)} aria-label={t("Prayer time settings")} title={t("Prayer time settings")} className="rounded-sm">
              <Settings2 className="text-ink-soft" />
            </Button>
          </>
        }
      />

      <NamazHero today={today} chips={chips} onSettings={() => setSettingsOpen(true)} openFailed={failed} onRetry={retryOpen} />

      <TodayPrayersCard current={current} today={today} onMark={mark} reminders={reminders} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1.1fr]">
        <QazaCard qaza={qaza} today={today} />

        <Card padding="none" className="flex min-w-0 flex-col gap-2.5 rounded-[14px] px-4.5 py-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[16px] font-semibold text-ink">{t("{month} so far", { month: monthName(currentKey, fmt) })}</h2>
            <span className="text-[12.5px] text-ink-muted">{t("Day {day} of {total}", { day: count(todayDay), total: count(monthDays) })}</span>
          </div>
          <div className="flex items-center gap-3.5">
            <span role="img" aria-label={t("{pct}% prayed", { pct: count(soFarPct) })} className="relative size-18.5 shrink-0">
              <svg viewBox="0 0 74 74" className="size-18.5 -rotate-90" aria-hidden="true">
                <circle cx="37" cy="37" r="30" fill="none" className="stroke-emerald-soft" strokeWidth="8" />
                <circle cx="37" cy="37" r="30" fill="none" className="stroke-emerald" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(soFarPct / 100) * RING} ${RING}`} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[15px] font-bold text-ink tabular-nums">{count(soFarPct)}%</span>
            </span>
            <div className="flex flex-col gap-1 text-small text-ink-soft">
              <span>{fillNodes(t("{count} of {total} prayed"), { count: <b className="font-bold text-ink">{count(soFarPrayed)}</b>, total: count(soFarDue) })}</span>
              <span>{fillNodes(t("{count} with jama'at"), { count: <b className="font-bold text-ink">{count(summary?.jamaat ?? 0)}</b> })}</span>
              <span>{fillNodes(t("{count} missed"), { count: <b className="font-bold text-ink">{count(soFarMissed)}</b> })}</span>
            </div>
          </div>
          <Button asChild className="mt-auto h-9.5 rounded-sm">
            <Link href="/habit-tracker/habits/namaz">
              {t("Open {month} report", { month: monthName(currentKey, fmt) })}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </Card>

        <Card padding="none" className="flex min-w-0 flex-col gap-2 rounded-[14px] px-4.5 py-4 md:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[16px] font-semibold text-ink">{t("Past months")}</h2>
            <button type="button" onClick={() => setAddOpen(true)} className="flex min-h-8 items-center gap-1 rounded-sm text-small font-semibold text-emerald hover:underline pointer-coarse:min-h-11">
              <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
              {t("Add earlier month")}
            </button>
          </div>
          {past.length === 0 ? (
            <p className="py-4 text-small text-ink-muted">{t("No earlier months yet. Add one to fill it in.")}</p>
          ) : (
            <div className="flex max-h-60 flex-col gap-0.5 overflow-y-auto">
              {past.map((tracker) => {
                const s = monthSummary(tracker);
                const key = `${tracker.year}-${pad(tracker.month ?? 1)}`;
                return (
                  <Link key={tracker.id} href={`/habit-tracker/habits/namaz/${tracker.id}`} className="grid grid-cols-[110px_minmax(0,1fr)_44px] items-center gap-3 rounded-sm px-1.5 py-2 text-ink hover:bg-surface-sunken">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[13.5px] font-semibold">{monthName(key, fmt, "long", true)}</span>
                      <span className="truncate text-[11.5px] text-ink-muted">
                        {s.due > 0 ? t("{done} of {total}", { done: count(s.prayed), total: count(s.due) }) : t("Not filled in yet")}
                        {tracker.id === bestPastId ? ` · ${t("best")}` : ""}
                      </span>
                    </span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                      <span className={cn("block h-full", s.due === 0 ? "bg-line" : s.pct >= 80 ? "bg-emerald" : "bg-warning-fill")} style={{ width: `${s.pct}%` }} />
                    </span>
                    <span className="text-right text-[13.5px] font-bold tabular-nums">{s.due > 0 ? `${count(s.pct)}%` : "—"}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Not on the board: how early each prayer's reminder comes, under the cards. */}
      {reminders.available && <PrayerRemindersCard book={reminders} today={today} onSettings={() => setSettingsOpen(true)} />}

      <EarlierMonthDialog open={addOpen} onClose={() => setAddOpen(false)} existing={trackers} currentMonth={currentKey} start="earlier" />
      <PrayerSettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} today={today} />
    </PageFrame>
  );
}
