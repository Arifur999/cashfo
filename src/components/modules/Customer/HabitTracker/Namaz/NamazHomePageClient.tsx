"use client";

import { ArrowRight, Calendar, Check, CheckCheck, Clock3, Plus, Settings2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { useMinuteClock } from "@/hooks/useMinuteClock";
import type { HabitMonthTracker, PrayerStatus, QazaSummary, Reminder } from "@/lib/customer/api";
import { actionError, monthShort, shiftDay } from "@/lib/customer/habitDisplay";
import { nextPrayer, prayerTimesFor } from "@/lib/customer/prayerTimes";
import { createHabitTrackerAction, setHabitTrackerCheckAction } from "@/lib/customer/habitsActions";
import { monthName } from "@/lib/customer/insights";
import { type CellState, cellState, hijriRange, isPrayed, MONTH_NAMES, monthSummary, prayedChecks, PRAYERS, trackerFor, yearSummary } from "@/lib/customer/namazDisplay";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
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

// Each state's small box on the month card, as the sheet draws it; a
// prayer still to come is a dashed box, the next one dashed in the brand.
const MINI: Record<CellState, string> = {
  jamaat: "bg-emerald text-on-action",
  onTime: "bg-emerald-tint text-emerald",
  qaza: "bg-warning-soft text-warning",
  missed: "bg-expense-soft text-expense",
  open: "border-[1.5px] border-dashed border-input bg-surface",
  locked: "border-[1.5px] border-dashed border-input bg-surface",
};
// The words each box's tooltip gives ("Fajr: on time").
const MINI_WORD: Record<CellState, string> = { jamaat: "with jama'at", onTime: "on time", qaza: "qaza, prayed after its time", missed: "missed", open: "not marked yet", locked: "later this month" };

// Past this many months the year chart drops its percentages over the bars
// (the figures stay in the chart's label): they no longer fit side by side.
const LABELLED_MONTHS = 6;

function StateIcon({ state, className }: { state: CellState; className?: string }) {
  if (state === "jamaat") return <CheckCheck className={className} strokeWidth={2.75} aria-hidden="true" />;
  if (state === "onTime") return <Check className={className} strokeWidth={3} aria-hidden="true" />;
  if (state === "qaza") return <Clock3 className={className} strokeWidth={2.5} aria-hidden="true" />;
  if (state === "missed") return <X className={className} strokeWidth={3} aria-hidden="true" />;
  return null;
}

// Habits › Namaz: today's five prayers to tap, this month at a glance, what
// was missed so far, the year so far, and every month's sheet. The current
// month's sheet opens on its own.
export function NamazHomePageClient({ trackers, qaza, today, reminders: savedReminders }: NamazHomePageClientProps) {
  const { t, locale, fmt } = useLocale();
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
  const [openFailed, setOpenFailed] = useState(false);
  const { settings } = usePrayerSettings();
  const now = useMinuteClock();
  // Today's next prayer, its box dashed in the brand (none once Isha is in).
  const upcoming = now ? nextPrayer(settings, today, shiftDay(today, 1), now) : null;
  const nextToday = upcoming && upcoming.at.getTime() === prayerTimesFor(settings, today)[upcoming.prayer].getTime() ? upcoming.prayer : null;
  const reminders = useReminderBook(savedReminders);
  const creating = useRef(false);
  const count = (n: number) => formatCount(n, fmt);

  // No sheet for this month yet: open one. Already there (Today or another
  // tab opened it at the same time) is as good as opened; a failure, or no
  // answer at all (offline), says so with a retry. Either way a refresh
  // brings in whatever sheet there is.
  const openSheet = useCallback(() => {
    if (creating.current) return;
    creating.current = true;
    createHabitTrackerAction({ category: "Namaz", month, year })
      .then((result) => result.success || /already exists/.test(result.message ?? ""))
      .catch(() => false)
      .then((opened) => {
        if (!opened) {
          creating.current = false;
          setOpenFailed(true);
        }
        router.refresh();
      });
  }, [month, year, router]);

  useEffect(() => {
    // Once the sheet is here, a later month (the page left open past the
    // 1st) can open its own.
    if (server) creating.current = false;
    else openSheet();
  }, [server, openSheet]);

  // The failure shows only while there is still no sheet.
  const failed = openFailed && !server;

  function retryOpen() {
    setOpenFailed(false);
    openSheet();
  }

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
  const yesterdayDone = current && todayDay > 1 ? prayedChecks(current).filter((c) => c.day === todayDay - 1).length : null;
  const yearNow = yearSummary(trackers, year);
  const months = [...trackers].sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (b.month ?? 0) - (a.month ?? 0));
  const bestId = yearNow.best?.tracker.id;
  const labelled = yearNow.months.length <= LABELLED_MONTHS;
  const monthDays = current?.totalDays ?? new Date(Date.UTC(year, month, 0)).getUTCDate();
  const thisMonthName = t(MONTH_NAMES[month - 1]);
  const yearText = toLocaleDigits(String(year), fmt);

  return (
    <PageFrame className="gap-5">
      <PageHeader
        title={t("Namaz")}
        description={t("The five daily prayers, month by month. Each new month opens on its own.")}
        actions={
          <Button variant="secondary" onClick={() => setSettingsOpen(true)} className="rounded-sm px-3.5">
            <Settings2 className="text-ink-soft" />
            {t("Prayer time settings")}
          </Button>
        }
      />

      <NamazHero current={current} today={today} onMark={mark} onSettings={() => setSettingsOpen(true)} openFailed={failed} onRetry={retryOpen} />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Card padding="none" className="flex min-w-0 flex-col gap-3 rounded-md px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-title font-semibold text-ink">{t("This month")}</h2>
            <Chip tone="mint" size="sm" className="px-2.25 text-[11.5px] text-emerald">
              {t("Opened automatically")}
            </Chip>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="text-[20px] leading-[normal] font-bold text-ink">{monthName(currentKey, fmt, "long", true)}</span>
            <span className="text-small text-ink-muted">{t("Day {day} of {total}", { day: count(todayDay), total: count(monthDays) })}</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {PRAYERS.map((item) => {
              const state: CellState = current ? cellState(current, todayDay, item) : "open";
              return (
                <span key={item} className="flex min-w-0 flex-col items-center gap-1.25 text-[11.5px] font-medium text-ink-soft">
                  <span title={`${t(item)}: ${t(MINI_WORD[state])}`} className={cn("flex size-8.5 items-center justify-center rounded-sm", MINI[state], item === nextToday && !isPrayed(state) && state !== "missed" && "border-emerald")}>
                    <StateIcon state={state} className="size-4" />
                  </span>
                  <span className="max-w-full truncate">{t(item)}</span>
                </span>
              );
            })}
          </div>
          <ul className="flex flex-col gap-1.5 text-small text-ink-2">
            {yesterdayDone !== null && (
              <li className="flex items-center gap-2">
                <Check className={cn("size-3.5 shrink-0", yesterdayDone === 5 ? "text-income" : "text-ink-muted")} strokeWidth={2.5} aria-hidden="true" />
                {yesterdayDone === 5 ? t("Yesterday, all five prayed") : t("Yesterday, {count} of 5 prayed", { count: count(yesterdayDone) })}
              </li>
            )}
            <li className="flex items-center gap-2">
              <Calendar className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
              {t("Each month opens on the 1st. Nothing to set up.")}
            </li>
          </ul>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2.5 border-t border-divider pt-3">
            <span className="text-small text-ink-2">{fillNodes(t("{figure} prayed so far"), { figure: <b className="font-bold text-ink">{t("{done} of {total}", { done: count(summary?.prayedSoFar ?? 0), total: count((current?.elapsedDays ?? 0) * 5 + 5) })}</b> })}</span>
            {current && (
              <Button asChild variant="action" size="sm" className="h-8.5 gap-1.5 rounded-sm px-3.5 shadow-none">
                <Link href={`/habit-tracker/habits/namaz/${current.id}`}>
                  {t("Open {month}", { month: monthName(currentKey, fmt) })}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            )}
          </div>
        </Card>

        <QazaCard qaza={qaza} today={today} />

        <Card padding="none" className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-md px-5 py-4 md:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-title font-semibold text-ink">{t("{year} so far", { year: yearText })}</h2>
            {yearNow.months[0] && <span className="text-caption font-normal text-ink-muted">{t("Since {month}", { month: t(MONTH_NAMES[yearNow.months[0].month - 1]) })}</span>}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[30px] leading-[normal] font-bold tracking-[-0.02em] text-ink tabular-nums">{count(yearNow.pct)}%</span>
            <span className="text-body text-ink-soft">{t("{done} of {total} prayed", { done: count(yearNow.prayed), total: count(yearNow.due) })}</span>
          </div>
          <div role="img" aria-label={[t("Share of prayers prayed each month"), ...yearNow.months.map((m) => `${t(MONTH_NAMES[m.month - 1])} ${count(m.pct)}%`)].join(", ")} className="flex flex-col gap-1.5">
            <div className={cn("flex h-21 items-end border-b border-line px-1", labelled ? "gap-3.5" : "gap-1")}>
              {yearNow.months.map((m) => (
                <span key={m.month} title={`${t(MONTH_NAMES[m.month - 1])}: ${count(m.pct)}%`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  {labelled && <span className="text-[11.5px] font-bold text-ink-2 tabular-nums">{count(m.pct)}%</span>}
                  <span className={cn("w-full max-w-11 rounded-t-[5px]", m.month === month ? "bg-emerald-tint" : "bg-emerald")} style={{ height: `${Math.max(4, m.pct * 0.6)}px` }} />
                </span>
              ))}
            </div>
            <div aria-hidden="true" className={cn("flex px-1", labelled ? "gap-3.5" : "gap-1")}>
              {yearNow.months.map((m) => (
                <span key={m.month} className="min-w-0 flex-1 truncate text-center text-[11.5px] font-normal text-ink-muted">
                  {monthShort(m.month, locale)}
                </span>
              ))}
            </div>
          </div>
          <span className="mt-auto text-[12.5px] text-ink-soft">
            {yearNow.best && <>{fillNodes(t("Best month: {month}."), { month: <b className="font-semibold text-ink">{t(MONTH_NAMES[yearNow.best.month - 1])}</b> })} </>}
            {t(todayDay === 1 ? "{month} has {count} day so far." : "{month} has {count} days so far.", { month: thisMonthName, count: count(todayDay) })}
          </span>
        </Card>
      </div>

      <section aria-labelledby="namaz-months" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="namaz-months" className="text-title font-semibold text-ink">
            {t("Months")}
          </h2>
          <button type="button" onClick={() => setAddOpen(true)} className="-mx-2 flex min-h-9 items-center gap-1.5 rounded-sm px-2 text-small font-semibold text-emerald hover:bg-surface-sunken pointer-coarse:min-h-11">
            <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
            {t("Add an earlier month")}
          </button>
        </div>
        {months.length === 0 ? (
          <Card padding="none" className="rounded-md px-5 py-8 text-center text-small text-ink-muted">
            {failed ? t("Couldn't open this month's sheet") : t("This month's sheet is opening…")}
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {months.map((tracker) => {
              const s = monthSummary(tracker);
              const now = tracker.id === current?.id;
              const key = `${tracker.year}-${pad(tracker.month ?? 1)}`;
              const perfect = s.perfectDays;
              return (
                <Link key={tracker.id} href={`/habit-tracker/habits/namaz/${tracker.id}`} className={cn("flex flex-col gap-2.5 rounded-md border bg-surface px-4.5 py-4 text-ink shadow-card transition-colors hover:border-line-strong", now ? "border-emerald" : "border-line")}>
                  <span className="flex items-start justify-between gap-2">
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[15px] leading-[normal] font-semibold">{monthName(key, fmt, "long", true)}</span>
                      <span className="text-caption font-normal text-ink-muted">{hijriRange(tracker.year as number, tracker.month as number, fmt, settings.hijriAdjust)}</span>
                    </span>
                    {now ? (
                      <Chip tone="forest" size="sm" className="bg-emerald text-on-action">
                        {t("This month")}
                      </Chip>
                    ) : tracker.id === bestId ? (
                      <Chip tone="income" size="sm">
                        {t("Best")}
                      </Chip>
                    ) : null}
                  </span>
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-[24px] leading-[normal] font-bold tracking-[-0.02em] tabular-nums">{count(s.pct)}%</span>
                    <span className="text-[12.5px] text-ink-soft tabular-nums">{t(now ? "{done} of {total} so far" : "{done} of {total}", { done: count(s.prayed), total: count(s.due) })}</span>
                  </span>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                    <span className={cn("block h-full rounded-full", now ? "bg-emerald-tint" : "bg-emerald")} style={{ width: `${s.pct}%` }} />
                  </span>
                  <span className="flex flex-wrap justify-between gap-x-2 text-caption font-normal text-ink-muted">
                    <span>{now ? t("Day {day} of {total}", { day: count(todayDay), total: count(tracker.totalDays) }) : t(perfect === 1 ? "{count} perfect day" : "{count} perfect days", { count: count(perfect) })}</span>
                    <span>{t("{count} with jama'at", { count: count(s.jamaat) })}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Not on the board: the prayers' reminders sit under the months,
          in the same card style. */}
      {reminders.available && <PrayerRemindersCard book={reminders} today={today} onSettings={() => setSettingsOpen(true)} />}

      <EarlierMonthDialog open={addOpen} onClose={() => setAddOpen(false)} existing={trackers} currentMonth={currentKey} />
      <PrayerSettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} today={today} />
    </PageFrame>
  );
}
