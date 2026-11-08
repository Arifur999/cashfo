"use client";

import { CalendarDays, Check, Flame, TrendingDown, TrendingUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import PageFrame from "@/components/smartly/PageFrame";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { usePrintInLight } from "@/hooks/usePrintInLight";
import type { Habit, HabitMonthLog } from "@/lib/customer/api";
import { categoryColorVar } from "@/lib/customer/categoryTone";
import { shiftMonth } from "@/lib/customer/groupDisplay";
import { actionError, dayText, habitStart, WEEKDAY_MIN, WEEKDAY_PLURAL } from "@/lib/customer/habitDisplay";
import { type CellState, daysOfMonth, habitMonthReport, habitTags, monthSummary } from "@/lib/customer/habitReport";
import { checkInHabitAction } from "@/lib/customer/habitsActions";
import { announceHabitsChanged } from "@/lib/customer/habitsEvents";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { EachBars, MonthStrip, ReportHeader, ReportSheet, ReportStats, StandsOut, WeekBars, type MonthOption, type StandOut } from "./MonthReport";

interface DailyHabitsReportClientProps {
  habits: Habit[];
  // The logs of every month the page can show (the 24 up to this one).
  logs: HabitMonthLog[];
  month: string;
  today: string;
  // The first month the list offers.
  firstMonth: string;
}

const hrefFor = (month: string, today: string) => (month === today.slice(0, 7) ? "/habit-tracker/daily/report" : `/habit-tracker/daily/report?month=${month}`);

// Daily habits › Monthly report (the DailyHabitsReport board): one month of
// every habit, day by day. A past or today's box can be changed: done, or
// missed.
export function DailyHabitsReportClient({ habits, logs, month, today, firstMonth }: DailyHabitsReportClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [picking, setPicking] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  usePrintInLight();
  const count = (n: number) => formatCount(n, fmt);

  const report = habitMonthReport(habits, logs, month, today, fmt);
  const current = month === today.slice(0, 7);
  // The months the list offers, newest first, each with its share done.
  const options: MonthOption[] = [];
  for (let key = today.slice(0, 7); key >= firstMonth; key = shiftMonth(key, -1)) {
    options.push({ key, label: monthName(key, fmt, "long", true), pct: monthSummary(habits, logs, key, today, fmt).pct, href: hrefFor(key, today) });
  }
  const previous = shiftMonth(month, -1);
  const before = previous >= firstMonth ? monthSummary(habits, logs, previous, today, fmt) : null;
  const change = before?.pct != null && report.pct !== null ? report.pct - before.pct : null;
  const previousName = monthName(previous, fmt);
  const tags = habitTags(report.rows);
  const monthShort = monthName(month, fmt, "short");

  const stats = [
    {
      label: t("Done"),
      value: report.due ? t("{done} of {total}", { done: count(report.done), total: count(report.due) }) : "—",
      sub:
        report.pct === null
          ? t("Nothing yet")
          : change === null
            ? t("{pct}% of planned", { pct: count(report.pct) })
            : t(change >= 0 ? "{pct}% of planned · up {change}% from {month}" : "{pct}% of planned · down {change}% from {month}", { pct: count(report.pct), change: count(Math.abs(change)), month: previousName }),
    },
    { label: t("Missed"), value: count(report.missed), sub: t("Planned but not done"), tone: report.missed ? ("bad" as const) : ("good" as const) },
    { label: t("Perfect days"), value: count(report.perfect), sub: t("Every planned habit done") },
    { label: t("Longest run"), value: report.longest ? t(report.longest.run === 1 ? "{count} day" : "{count} days", { count: count(report.longest.run) }) : "—", sub: report.longest?.habit.name ?? t("Nothing in a row yet") },
  ];

  const mark = (habit: Habit, day: string, done: boolean) =>
    startBusy(async () => {
      setPicking(null);
      const result = await checkInHabitAction(habit.id, done ? { date: day, completed: true, value: habit.targetValue ?? undefined } : { date: day, completed: false, value: habit.targetValue ? 0 : undefined });
      if (!result.success) {
        toast.error(actionError(result.message, "Failed to check in", t, fmt));
        return;
      }
      router.refresh();
      announceHabitsChanged();
    });

  const legend: { state: CellState; label: string }[] = [
    { state: "done", label: t("Done") },
    { state: "missed", label: t("Missed") },
    { state: "rest", label: t("Not planned") },
    { state: "open", label: t("Open today") },
  ];

  const rows = report.rows.map((row) => ({
    key: row.habit.id,
    name: row.habit.name,
    count: `${count(row.done)}/${count(row.due)}`,
    cells: row.cells.map((state, index) => {
      const day = report.days[index];
      const id = `${row.habit.id}:${day.key}`;
      // A done, missed or open box can change; so can a free day of an
      // "N times a week" habit once it had started.
      const canPick = state === "done" || state === "missed" || state === "open" || (state === "rest" && row.habit.frequencyType === "WEEKLY_COUNT" && day.key >= habitStart(row.habit, logs) && day.key <= today);
      const title = `${row.habit.name}, ${dayText(day.key, fmt, "dayMonth")}: ${t(STATE_WORD[state])}`;
      const box = <HabitBox state={state} color={row.habit.color} />;
      if (!canPick) {
        return (
          <span key={day.key} role="gridcell" title={title} aria-label={title} className={cn(state === "later" && "cursor-not-allowed")}>
            {box}
          </span>
        );
      }
      return (
        <Popover key={day.key} open={picking === id} onOpenChange={(open) => setPicking(open ? id : null)}>
          <PopoverAnchor asChild>
            <button type="button" role="gridcell" title={title} aria-label={title} aria-haspopup="dialog" disabled={busy} onClick={() => setPicking(picking === id ? null : id)} className="rounded-[6px] focus-visible:outline-2 focus-visible:outline-focus-ring">
              {box}
            </button>
          </PopoverAnchor>
          <PopoverContent align="center" className="w-60 p-1.5">
            <p className="flex flex-col gap-0.5 px-2.5 pt-2 pb-1.5">
              <span className="text-[15px] leading-[normal] font-semibold text-ink">
                {row.habit.name} · {dayText(day.key, fmt, "dayMonth")}
              </span>
              <span className="text-[12.5px] leading-[normal] text-ink-muted">{t("Was it done that day?")}</span>
            </p>
            {[
              { done: true, title: t("Done"), sub: t("Ticked off that day"), state: "done" as const },
              { done: false, title: t("Missed"), sub: t("Planned but not done"), state: "missed" as const },
            ].map((option) => (
              <button
                key={option.title}
                type="button"
                onClick={() => mark(row.habit, day.key, option.done)}
                aria-pressed={(state === "done") === option.done && state !== "open" && state !== "rest"}
                className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left hover:bg-surface-sunken"
              >
                <HabitBox state={option.state} color={row.habit.color} />
                <span className="flex flex-col">
                  <span className="text-small font-semibold text-ink">{option.title}</span>
                  <span className="text-caption text-ink-muted">{option.sub}</span>
                </span>
              </button>
            ))}
          </PopoverContent>
        </Popover>
      );
    }),
  }));

  const totals = report.totals.map((total) =>
    total
      ? {
          text: `${count(total.done)}/${count(total.due)}`,
          title: t("{done} of {total} planned habits done", { done: count(total.done), total: count(total.due) }),
          tone: total.done === total.due ? ("full" as const) : total.done / total.due >= 0.6 ? ("good" as const) : ("low" as const),
        }
      : null,
  );

  const each = report.rows.map((row) => {
    const tag = tags.get(row.habit.id);
    const donePct = row.due ? (row.done / row.due) * 100 : 0;
    return {
      key: row.habit.id,
      name: row.habit.name,
      tag: tag ? { text: t(tag === "best" ? "Best" : "Needs work"), tone: tag === "best" ? ("good" as const) : ("bad" as const) } : undefined,
      segments: [
        { pct: donePct, style: { backgroundColor: categoryColorVar(row.habit.color) } },
        { pct: row.due ? 100 - donePct : 0, className: "bg-expense-line" },
      ],
      value: count(row.done),
      total: count(row.due),
      title: t("Done {done} · Missed {missed}", { done: count(row.done), missed: count(row.missed) }),
    };
  });

  const weeks = report.weeks.map((week) => ({
    key: `${week.from}`,
    label: `${count(week.from)}–${count(week.to)}`,
    pct: week.pct,
    title: week.pct === null ? t("Days {from} to {to}: nothing yet", { from: count(week.from), to: count(week.to) }) : t("Days {from} to {to}: {pct}% done", { from: count(week.from), to: count(week.to), pct: count(week.pct) }),
  }));

  const insights: StandOut[] = [];
  if (change !== null && before?.pct != null) {
    insights.push({ key: "change", icon: change >= 0 ? TrendingUp : TrendingDown, tone: change >= 0 ? "good" : "bad", text: t(change >= 0 ? "Up {change}% from {month} ({pct}%)." : "Down {change}% from {month} ({pct}%).", { change: count(Math.abs(change)), month: monthName(previous, fmt, "long", true), pct: count(before.pct) }) });
  }
  const needsWork = report.rows.find((row) => tags.get(row.habit.id) === "needs-work");
  if (needsWork) {
    insights.push({ key: "missed", icon: X, tone: "bad", text: t("{name} was missed most: {missed} of {due} days. Try a smaller goal or a reminder.", { name: needsWork.habit.name, missed: count(needsWork.missed), due: count(needsWork.due) }) });
  }
  const worst = Math.max(...report.missesByWeekday);
  if (worst > 1) {
    insights.push({ key: "weekday", icon: CalendarDays, tone: "warn", text: t("Most misses were on {days} ({count}). Plan that day ahead.", { days: t(WEEKDAY_PLURAL[report.missesByWeekday.indexOf(worst)]), count: count(worst) }) });
  }
  if (report.longest) {
    insights.push({ key: "run", icon: Flame, tone: "streak", text: t(report.longest.run === 1 ? "Longest run: {count} day of {name}." : "Longest run: {count} days of {name}.", { count: count(report.longest.run), name: report.longest.habit.name }) });
  }

  return (
    <PageFrame className="gap-3.5 md:pt-6">
      <ReportHeader
        title={monthName(month, fmt, "long", true)}
        current={current}
        subtitle={[current ? t("This month so far") : null, t(report.rows.length === 1 ? "{count} habit" : "{count} habits", { count: count(report.rows.length) })].filter(Boolean).join(" · ")}
        months={options}
        selected={month}
        today={today}
        onPrint={() => window.print()}
      />
      <ReportStats stats={stats} />
      {report.rows.length === 0 ? (
        <p className="rounded-[12px] border border-line-card bg-surface px-5 py-10 text-center text-body text-ink-muted shadow-card">{t("No habits in this month yet.")}</p>
      ) : (
        <>
          <ReportSheet
            title={t("Habit sheet")}
            label={t("{month} habit sheet", { month: monthName(month, fmt, "long", true) })}
            legend={legend.map((item) => ({ label: item.label, swatch: <HabitBox state={item.state} color={null} small /> }))}
            hint={t("Tap a box to change it")}
            columns={daysOfMonth(month).map((day) => ({
              key: day.key,
              day: count(day.day),
              weekday: t(WEEKDAY_MIN[day.weekday]),
              title: `${day.key === today ? `${t("Today")}, ` : ""}${t(WEEKDAY_MIN[day.weekday])} ${count(day.day)} ${monthShort}`,
              today: day.key === today,
              friday: day.weekday === 5,
            }))}
            rows={rows}
            totalsLabel={t("Done that day")}
            totals={totals}
          />
          <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <EachBars title={t("Each habit")} rows={each} note={t("Coloured part done, pink part missed. Hover a bar for numbers.")} />
            <WeekBars title={t("Week by week")} label={t("Percent done in each week")} weeks={weeks} />
            <StandsOut title={t("What stands out")} items={insights.slice(0, 4)} empty={t("Nothing to point out yet.")} />
          </div>
        </>
      )}
      <MonthStrip title={t("Other months")} months={options.slice(0, 6)} selected={month} />
    </PageFrame>
  );
}

const STATE_WORD: Record<CellState, string> = { done: "done", missed: "missed", rest: "not planned", open: "still open today", later: "later this month" };

// One box of the sheet: done in the habit's colour with a tick, missed in
// pink with a cross, free, open today (dashed) or still ahead.
function HabitBox({ state, color, small = false }: { state: CellState; color: string | null; small?: boolean }) {
  const accent = color ? categoryColorVar(color) : "var(--emerald)";
  return (
    <span
      aria-hidden="true"
      style={state === "done" ? { backgroundColor: accent } : state === "open" ? { borderColor: accent } : undefined}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[6px]",
        small ? "size-4 rounded-[4px]" : "h-6.25 w-6.5",
        state === "done" ? "text-surface" : state === "missed" ? "bg-expense-soft text-expense" : state === "open" ? "border-[1.5px] border-dashed bg-surface" : state === "later" ? "border border-divider bg-strip" : "border border-divider bg-surface",
      )}
    >
      {state === "done" && <Check className={small ? "size-2.5" : "size-3.5"} strokeWidth={3} />}
      {state === "missed" && <X className={small ? "size-2.5" : "size-3.5"} strokeWidth={3} />}
    </span>
  );
}
