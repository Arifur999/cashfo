"use client";

import { Plus, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { usePrayerSettings } from "@/components/modules/Customer/Providers/PrayerSettingsProvider";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import PageFrame from "@/components/smartly/PageFrame";
import { usePrintInLight } from "@/hooks/usePrintInLight";
import type { HabitMonthTracker, PrayerStatus } from "@/lib/customer/api";
import { actionError } from "@/lib/customer/habitDisplay";
import { setHabitTrackerCheckAction } from "@/lib/customer/habitsActions";
import { monthName } from "@/lib/customer/insights";
import { hijriRange, monthInsights, monthSummary, namazWeeks, prayerSummaries, trackerFor } from "@/lib/customer/namazDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { EachBars, MonthStrip, ReportHeader, ReportStats, StandsOut, WeekBars, type MonthOption, type StandOut } from "../Report/MonthReport";
import { BoxSwatch, type BoxState } from "../Tracker/SheetBox";
import { withCheck } from "../trackerChecks";
import { EarlierMonthDialog } from "./EarlierMonthDialog";
import { NamazGoalChip } from "./NamazGoalChip";
import { INSIGHT_ICON, insightText } from "./namazWords";
import { PrayerSheet } from "./PrayerSheet";
import { useThisMonthSheet } from "./useThisMonthSheet";

interface NamazDashboardClientProps {
  trackers: HabitMonthTracker[];
  // "YYYY-MM" shown.
  month: string;
  today: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (tracker: HabitMonthTracker) => `${tracker.year}-${pad(tracker.month ?? 1)}`;
const hrefFor = (key: string, today: string) => (key === today.slice(0, 7) ? "/habit-tracker/habits/namaz" : `/habit-tracker/habits/namaz?month=${key}`);

const LEGEND: { state: BoxState; label: string }[] = [
  { state: "jamaat", label: "Jama'at" },
  { state: "onTime", label: "On time" },
  { state: "qaza", label: "Qaza" },
  { state: "missed", label: "Missed" },
  { state: "open", label: "Not marked" },
];

const TONE = { money: "good", expense: "bad", warning: "warn", insights: "info" } as const;

// Worship › Namaz › Dashboard (the NamazDashboard board): one month's
// figures, its sheet to mark, each prayer's share, the weeks, what stands
// out, and every month to pick from. This month's sheet opens on its own.
export function NamazDashboardClient({ trackers, month, today }: NamazDashboardClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const { settings } = usePrayerSettings();
  const [addOpen, setAddOpen] = useState(false);
  const [, startTransition] = useTransition();
  usePrintInLight();
  const count = (n: number) => formatCount(n, fmt);
  const [year, monthNumber] = month.split("-").map(Number);
  const isCurrent = month === today.slice(0, 7);
  const server = trackerFor(trackers, year, monthNumber);
  const opener = useThisMonthSheet(server, year, monthNumber, isCurrent);
  const [sheet, applyMark] = useOptimistic(server, (current, update: { day: number; item: string; status: PrayerStatus | null }) => (current ? withCheck(current, update.day, update.item, update.status !== null, update.status ?? undefined) : current));

  const sorted = [...trackers].sort((a, b) => keyOf(b).localeCompare(keyOf(a)));
  const options: MonthOption[] = sorted.map((tracker) => {
    const key = keyOf(tracker);
    const s = monthSummary(tracker);
    return { key, label: monthName(key, fmt, "long", true), pct: s.due > 0 ? s.pct : null, href: hrefFor(key, today) };
  });
  if (!options.some((option) => option.key === month)) options.unshift({ key: month, label: monthName(month, fmt, "long", true), pct: null, href: hrefFor(month, today) });

  function mark(day: number, item: string, status: PrayerStatus | null) {
    if (!sheet) return;
    startTransition(async () => {
      applyMark({ day, item, status });
      const result = await setHabitTrackerCheckAction(sheet.id, status ? { day, item, checked: true, status } : { day, item, checked: false });
      if (result.success) router.refresh();
      else toast.error(actionError(result.message, "Failed to update", t, fmt));
    });
  }

  const createButton = (
    <Button onClick={() => setAddOpen(true)} className="h-10 rounded-sm pointer-coarse:h-11">
      <Plus strokeWidth={2.25} />
      {t("Create month")}
    </Button>
  );
  const header = (
    <ReportHeader
      title={monthName(month, fmt, "long", true)}
      current={isCurrent}
      subtitle={hijriRange(year, monthNumber, fmt, settings.hijriAdjust, true)}
      months={options}
      selected={month}
      today={today}
      onPrint={() => window.print()}
      action={createButton}
      chip={sheet && <NamazGoalChip trackerId={sheet.id} goalPct={sheet.goalPct ?? null} />}
    />
  );

  if (!sheet) {
    return (
      <PageFrame className="gap-3.5 md:pt-6">
        {header}
        <Card padding="lg" className="flex flex-col items-center gap-3 rounded-[12px] py-10 text-center">
          <p className="text-body text-ink-muted">{isCurrent ? (opener.failed ? t("Couldn't open this month's sheet") : t("This month's sheet is opening…")) : t("No sheet for {month} yet.", { month: monthName(month, fmt, "long", true) })}</p>
          {isCurrent && opener.failed && (
            <Button variant="secondary" onClick={opener.retry}>
              {t("Try again")}
            </Button>
          )}
        </Card>
        <EarlierMonthDialog open={addOpen} onClose={() => setAddOpen(false)} existing={trackers} currentMonth={today.slice(0, 7)} onCreated={(_, key) => router.push(hrefFor(key, today))} />
      </PageFrame>
    );
  }

  // Past days owe all five; today counts its marks so far.
  const summary = monthSummary(sheet);
  const todayMarks = sheet.todayDay !== null ? sheet.checks.filter((c) => c.day === sheet.todayDay) : [];
  const prayedToday = todayMarks.filter((c) => c.status !== "MISSED").length;
  const missedToday = todayMarks.length - prayedToday;
  const prayed = summary.prayed + prayedToday;
  const due = summary.due + todayMarks.length;
  const pct = due > 0 ? Math.round((prayed / due) * 100) : 0;
  const missed = summary.missed + missedToday;
  const qaza = sheet.checks.filter((c) => c.status === "QAZA").length;
  const index = sorted.findIndex((tracker) => tracker.id === sheet.id);
  const previous = sorted[index + 1] && keyOf(sorted[index + 1]) < month ? sorted[index + 1] : null;
  const previousSummary = previous ? monthSummary(previous) : null;
  const change = previousSummary && previousSummary.due > 0 && due > 0 ? pct - previousSummary.pct : null;

  const stats = [
    {
      label: t("Prayed"),
      value: t("{done} of {total}", { done: count(prayed), total: count(due) }),
      sub:
        change === null
          ? t("{pct}% of the month", { pct: count(pct) })
          : t(change >= 0 ? "{pct}% of the month · up {change}% from {month}" : "{pct}% of the month · down {change}% from {month}", { pct: count(pct), change: count(Math.abs(change)), month: monthName(keyOf(previous!), fmt) }),
    },
    { label: t("With jama'at"), value: count(summary.jamaat), sub: t("{pct}% of the prayers prayed", { pct: count(summary.prayedSoFar > 0 ? Math.round((summary.jamaat / summary.prayedSoFar) * 100) : 0) }) },
    { label: t("Perfect days"), value: count(summary.perfectDays), sub: t("All five on time or with jama'at") },
    { label: t("Missed or qaza"), value: count(missed + qaza), sub: t("{missed} missed · {qaza} prayed late", { missed: count(missed), qaza: count(qaza) }), tone: missed + qaza > 0 ? ("bad" as const) : ("good" as const) },
  ];

  const each = prayerSummaries(sheet).map((row) => {
    const mark = todayMarks.find((c) => c.item === row.item);
    const add = (status: PrayerStatus) => (mark?.status === status ? 1 : 0);
    const jamaat = row.jamaat + add("JAMAAT");
    const onTime = row.onTime + add("ON_TIME");
    const late = row.qaza + add("QAZA");
    const lost = row.missed + add("MISSED");
    const rowDue = row.due + (mark ? 1 : 0);
    const share = (n: number) => (rowDue > 0 ? (n / rowDue) * 100 : 0);
    return {
      key: row.item,
      name: t(row.item),
      segments: [
        { pct: share(jamaat), className: "bg-emerald" },
        { pct: share(onTime), className: "bg-emerald-tint" },
        { pct: share(late), className: "bg-warning-fill" },
        { pct: share(lost), className: "bg-expense-line" },
      ],
      value: count(jamaat + onTime + late),
      total: count(rowDue),
      title: t("Jama'at {jamaat} · On time {onTime} · Qaza {qaza} · Missed {missed}", { jamaat: count(jamaat), onTime: count(onTime), qaza: count(late), missed: count(lost) }),
    };
  });

  const weeks = namazWeeks(sheet).map((week) => ({
    key: `${week.from}`,
    label: `${count(week.from)}–${count(week.to)}`,
    pct: week.pct,
    title: week.pct === null ? t("Days {from} to {to}: nothing yet", { from: count(week.from), to: count(week.to) }) : t("Days {from} to {to}: {pct}% prayed", { from: count(week.from), to: count(week.to), pct: count(week.pct) }),
  }));

  const insights: StandOut[] = monthInsights(sheet, previous).map((insight, i) => ({ key: `${insight.key}-${i}`, icon: INSIGHT_ICON[insight.key], tone: TONE[insight.tone], text: insightText(insight, t, fmt) }));
  // The month's goal, once anything is marked: reached, or how far to go.
  const goal = sheet.goalPct ?? null;
  if (goal !== null && due > 0)
    insights.push({ key: "goal", icon: Target, tone: "warn", text: pct >= goal ? t("Goal of {goal}% reached.", { goal: count(goal) }) : t("{gap}% to go to reach the goal of {goal}%.", { gap: count(goal - pct), goal: count(goal) }) });

  return (
    <PageFrame className="gap-3.5 md:pt-6">
      {header}

      <ReportStats stats={stats} />

      <Card padding="none" className="flex min-w-0 flex-col gap-3 rounded-[12px] px-4.5 pt-3 pb-3.5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 className="text-[15px] font-semibold text-ink">{t("Prayer sheet")}</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption text-ink-2">
            {LEGEND.map((entry) => (
              <span key={entry.state} className="flex items-center gap-1.25">
                <BoxSwatch state={entry.state} />
                {t(entry.label)}
              </span>
            ))}
            <span className="border-l border-line pl-3 text-ink-muted print:hidden">{t("Tap a box to change it")}</span>
          </div>
        </div>
        <PrayerSheet tracker={sheet} onMark={mark} totalsLabel={t("Prayed that day")} rowLabel={(item) => t(item)} />
      </Card>

      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <EachBars title={t("Each prayer")} rows={each} note={t("Bar: jama'at · on time · qaza · missed. Hover a bar for numbers.")} />
        <WeekBars title={t("Week by week")} label={t("Percent prayed in each week")} weeks={weeks} />
        <StandsOut title={t("What stands out")} items={insights} empty={t("Mark a few days and the month starts to speak.")} />
      </div>

      <MonthStrip title={t("All months")} months={options.slice(0, 6)} selected={month} />

      <EarlierMonthDialog open={addOpen} onClose={() => setAddOpen(false)} existing={trackers} currentMonth={today.slice(0, 7)} onCreated={(_, key) => router.push(hrefFor(key, today))} />
    </PageFrame>
  );
}
