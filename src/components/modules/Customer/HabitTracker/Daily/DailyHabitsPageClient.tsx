"use client";

import { ArchiveRestore, ChartColumn, Check, ChevronLeft, ChevronRight, Minus, Moon, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createElement, useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Button from "@/components/smartly/Button";
import EmptyState from "@/components/smartly/EmptyState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Habit } from "@/lib/customer/api";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryColorVar, categoryTone } from "@/lib/customer/categoryTone";
import { actionError, amountLabel, completionRate, countStep, countsOn, dayMark, dayText, habitStart, lastDays, perfectDays, plannedCount, ruleLabel, ruleLine, shiftDay, streakText, weekOf } from "@/lib/customer/habitDisplay";
import { checkInHabitAction, removeCheckInAction, updateHabitAction } from "@/lib/customer/habitsActions";
import { announceHabitsChanged } from "@/lib/customer/habitsEvents";
import { formatCount } from "@/lib/i18n/digits";
import { redigit } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { useReminderBook } from "../Reminders";
import { AmountPopover } from "../Tracker/AmountPopover";
import { CloseButton } from "../Tracker/PanelParts";
import type { DailyHabitsData } from "./dailyTypes";
import { HabitDetailPanel } from "./HabitDetailPanel";
import { HabitDrawer } from "./HabitDrawer";

// The habit's month sits beside the cards from 1280px, as the board lays
// it out (two columns of cards and the 340px panel); narrower, a card
// opens its month in a bottom sheet. Keep in step with the xl classes below.
const SIDE_PANEL = "(min-width: 1280px)";
const RING = 2 * Math.PI * 26;

type Tab = "all" | "todo" | "done";

// A habit's log on the day shown: the server's, or a tap's until it lands.
type DayLog = { completed: boolean; value: number | null; note: string | null };

// Daily habits (the DailyHabits board): the day's progress in a banner,
// every habit as a card with its week, streak and 30-day rate, ticked off
// (or counted up) for the day being viewed, and one habit's month on the
// side (in a bottom sheet where the side has no room).
export function DailyHabitsPageClient({ data }: { data: DailyHabitsData }) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery(SIDE_PANEL);
  const { today, day, habits, todayRows, stats, logs, panelMonth, panelLogs, bestLogs } = data;
  const reminders = useReminderBook(data.reminders);
  const isToday = day === today;
  const active = habits.filter((h) => !h.isArchived);
  const archived = habits.filter((h) => h.isArchived);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; editing: Habit | null }>({ open: false, editing: null });
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  // Cards with a request in flight wait on their own; the others stay live.
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const [tapped, applyLog] = useOptimistic<Record<string, DayLog | null>, { id: string; log: DayLog | null }>({}, (current, update) => ({ ...current, [update.id]: update.log }));
  const picker = useRef<HTMLInputElement>(null);
  const count = (n: number) => formatCount(n, fmt);

  const serverLog = (habit: Habit): DayLog | null => {
    if (isToday) {
      const row = todayRows.find((r) => r.id === habit.id);
      return row?.todayLog ? { completed: row.todayLog.completed, value: row.todayLog.value, note: row.todayLog.note } : null;
    }
    const log = logs.find((l) => l.habitId === habit.id && l.date.slice(0, 10) === day);
    return log ? { completed: log.completed, value: log.value, note: null } : null;
  };
  const logFor = (habit: Habit): DayLog | null => (Object.hasOwn(tapped, habit.id) ? tapped[habit.id] : serverLog(habit));
  const streakOf = (habit: Habit) => todayRows.find((r) => r.id === habit.id)?.streak ?? stats.find((s) => s.habitId === habit.id)?.currentStreak ?? 0;

  const planned = active.filter((h) => countsOn(h, logs, day));
  const done = planned.filter((h) => logFor(h)?.completed);
  const open = planned.filter((h) => !logFor(h)?.completed);
  const week = weekOf(day, fmt);
  const last30 = lastDays(day, 30);
  const longest = [...active].map((h) => ({ habit: h, streak: streakOf(h) })).sort((a, b) => b.streak - a.streak)[0];
  const planned30 = active.reduce((sum, h) => sum + plannedCount(h, last30.filter((d) => d >= habitStart(h, logs)), fmt), 0);
  const done30 = logs.filter((l) => l.completed && last30.includes(l.date.slice(0, 10)) && active.some((h) => h.id === l.habitId)).length;
  const perfect = perfectDays(active, logs, last30);
  const selected = active.find((h) => h.id === selectedId) ?? planned[0] ?? active[0] ?? null;
  const pct = planned.length > 0 ? Math.round((done.length / planned.length) * 100) : 0;

  // A new day shows its own month in the panel.
  function goTo(nextDay: string) {
    router.push(nextDay === today ? "/habit-tracker/daily" : `/habit-tracker/daily?day=${nextDay}`);
  }

  // The panel's month alone; the day's cards stay put.
  function goToMonth(month: string) {
    const query = new URLSearchParams();
    if (!isToday) query.set("day", day);
    if (month !== day.slice(0, 7)) query.set("month", month);
    const search = query.toString();
    router.push(search ? `/habit-tracker/daily?${search}` : "/habit-tracker/daily", { scroll: false });
  }

  function openPicker() {
    try {
      picker.current?.showPicker();
    } catch {
      // A browser without showPicker: the focused field still takes typing.
      picker.current?.focus();
    }
  }

  function run(habit: Habit, log: DayLog | null, action: () => Promise<{ success: boolean; message?: string }>) {
    if (busy.has(habit.id)) return;
    setBusy((prev) => new Set(prev).add(habit.id));
    startTransition(async () => {
      applyLog({ id: habit.id, log });
      const result = await action();
      if (result.success) {
        router.refresh();
        announceHabitsChanged();
      } else toast.error(actionError(result.message, "Failed to check in", t, fmt));
      setBusy((prev) => {
        const rest = new Set(prev);
        rest.delete(habit.id);
        return rest;
      });
    });
  }

  // Undoing keeps the day's note: the log stays, marked not done. Only
  // today's note is known here, so an earlier day's log is never deleted.
  const undo = (habit: Habit, log: DayLog | null) =>
    isToday && !log?.note ? removeCheckInAction(habit.id, day) : checkInHabitAction(habit.id, { date: day, completed: false, value: habit.targetValue ? 0 : undefined });

  const toggle = (habit: Habit) => {
    const log = logFor(habit);
    const next: DayLog = { completed: !log?.completed, value: log?.value ?? null, note: log?.note ?? null };
    run(habit, next, () => (log?.completed ? undo(habit, log) : checkInHabitAction(habit.id, { date: day, completed: true })));
  };
  const setCount = (habit: Habit, value: number) => {
    const log = logFor(habit);
    const amount = Math.max(0, value);
    const target = habit.targetValue ?? 0;
    run(habit, { completed: amount >= target && amount > 0, value: amount, note: log?.note ?? null }, () =>
      amount === 0 ? undo(habit, log) : checkInHabitAction(habit.id, { date: day, value: amount, completed: amount >= target, note: log?.note ?? undefined }),
    );
  };
  const restore = (habit: Habit) => {
    if (busy.has(habit.id)) return;
    setBusy((prev) => new Set(prev).add(habit.id));
    startTransition(async () => {
      const result = await updateHabitAction(habit.id, { isArchived: false });
      if (result.success) {
        toast.success(t("{name} is back", { name: habit.name }));
        router.refresh();
        announceHabitsChanged();
      } else toast.error(actionError(result.message, "Failed to bring the habit back", t, fmt));
      setBusy((prev) => {
        const rest = new Set(prev);
        rest.delete(habit.id);
        return rest;
      });
    });
  };

  function select(habit: Habit) {
    setSelectedId(habit.id);
    if (!wide) setSheetOpen(true);
  }

  const heroTitle =
    planned.length === 0
      ? t(isToday ? "Nothing planned today" : "Nothing planned that day")
      : open.length === 0
        ? t(isToday ? "All done for today 🎉" : "Everything planned was done")
        : t(isToday ? "{done} of {total} done today" : "{done} of {total} done that day", { done: count(done.length), total: count(planned.length) });
  const heroSub =
    planned.length === 0
      ? t("Rest, or add a habit for days like this.")
      : open.length === 0
        ? t("Every habit planned for the day is ticked off.")
        : t("{count} still to go: {names}", { count: count(open.length), names: open.map((h) => h.name).join(", ") });
  const chips = [
    { label: t("Longest streak"), value: longest && longest.streak > 0 ? streakText(longest.habit, longest.streak, t, fmt) : "—" },
    { label: redigit(t("Last 30 days"), fmt), value: planned30 > 0 ? `${count(Math.min(100, Math.round((done30 / planned30) * 100)))}%` : "—" },
    { label: t("Perfect days"), value: t("{done} of {total}", { done: count(perfect), total: count(30) }) },
  ];

  const shown = tab === "todo" ? open : tab === "done" ? done : active;
  const panel = (inSheet: boolean) =>
    selected && (
      <HabitDetailPanel
        habit={selected}
        today={today}
        day={day}
        month={panelMonth}
        bestLogs={bestLogs}
        monthLogs={panelLogs}
        logs={logs}
        streak={streakOf(selected)}
        bestStreak={stats.find((s) => s.habitId === selected.id)?.bestStreak}
        note={isToday ? (logFor(selected)?.note ?? null) : null}
        todayLog={isToday ? logFor(selected) : null}
        onEdit={() => {
          setSheetOpen(false);
          setDrawer({ open: true, editing: selected });
        }}
        onMonthChange={goToMonth}
        inSheet={inSheet}
      />
    );

  const card = (habit: Habit) => {
    const log = logFor(habit);
    const tone = categoryTone(habit.color);
    const rule = ruleLabel(habit, t, fmt);
    const counted = !!habit.targetValue;
    const target = habit.targetValue ?? 1;
    const step = countStep(target);
    const rest = !countsOn(habit, logs, day);
    const streak = streakOf(habit);
    const rate = completionRate(habit, logs, last30.filter((d) => d >= habitStart(habit, logs)), fmt);
    const on = selected?.id === habit.id;
    // Marked only while its month can be seen: beside the cards, or in the sheet.
    const lit = on && (wide || sheetOpen);
    const value = log?.value ?? 0;
    const waiting = busy.has(habit.id);
    const isDone = !!log?.completed;
    // "3 times a week · 2 of 3 done": how the week stands, the day on show by its tick.
    const weekDone = logs.filter((l) => l.habitId === habit.id && l.completed && l.date.slice(0, 10) !== day && week.includes(l.date.slice(0, 10))).length + (isDone ? 1 : 0);
    const line = habit.frequencyType === "WEEKLY_COUNT" && !counted ? `${ruleLine(habit, t, fmt)} · ${t("{done} of {total} done", { done: count(weekDone), total: count(habit.weeklyCount ?? 1) })}` : ruleLine(habit, t, fmt);
    return (
      <li
        key={habit.id}
        aria-busy={waiting || undefined}
        style={lit ? { borderColor: categoryColorVar(habit.color) } : undefined}
        className={cn("relative flex flex-col gap-2.5 rounded-[12px] border-[1.5px] p-3.5 transition-colors", lit ? "" : isDone ? "border-divider bg-strip" : "border-line bg-surface hover:border-line-strong")}
      >
        <div className="flex items-center gap-3">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[11px] [&_svg]:size-5", tone.bg, tone.fg)}>{createElement(budgetCategoryIcon(habit.icon), { "aria-hidden": true })}</span>
          {/* The whole card picks the habit for the panel; its buttons sit above. */}
          <button
            type="button"
            onClick={() => select(habit)}
            aria-pressed={wide ? on : undefined}
            aria-haspopup={wide ? undefined : "dialog"}
            aria-label={t("Show {name}'s month", { name: habit.name })}
            className="flex min-w-0 flex-1 flex-col gap-px text-left after:absolute after:inset-0 after:rounded-[12px] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-focus-ring"
          >
            <span className="truncate text-[15px] font-semibold text-ink">{habit.name}</span>
            <span className="truncate text-[12.5px] text-ink-muted">{line}</span>
          </button>
          {rest ? (
            <span title={rule.days} className="relative z-10 flex h-7.5 shrink-0 items-center gap-1.5 rounded-full bg-surface-sunken px-3 text-[12.5px] font-semibold text-ink-soft">
              <Moon className="size-3.25 text-ink-muted" strokeWidth={2.25} aria-hidden="true" />
              {t("Rest day")}
            </span>
          ) : (
            !counted && (
              <button
                type="button"
                onClick={() => toggle(habit)}
                disabled={waiting}
                aria-pressed={isDone}
                aria-label={isDone ? t("{name}, done. Tap to undo", { name: habit.name }) : t("Mark {name} as done", { name: habit.name })}
                style={isDone ? { backgroundColor: categoryColorVar(habit.color) } : undefined}
                className={cn("relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full transition-colors", isDone ? "text-surface" : "border-2 border-input bg-surface text-ink-faint hover:border-emerald hover:text-emerald", waiting && "opacity-70")}
              >
                <Check className="size-5" strokeWidth={2.75} aria-hidden="true" />
              </button>
            )
          )}
        </div>

        {counted && !rest && (
          <div className={cn("relative z-10 flex items-center gap-2.5", waiting && "opacity-70")}>
            <button type="button" onClick={() => setCount(habit, value - step)} disabled={waiting || value === 0} aria-label={step === 1 ? t("One less: {name}", { name: habit.name }) : t("{count} less: {name}", { count: count(step), name: habit.name })} className="flex size-8.5 shrink-0 items-center justify-center rounded-[9px] border border-input bg-surface text-ink-soft hover:bg-surface-sunken disabled:opacity-40 pointer-coarse:size-11">
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <AmountPopover name={habit.name} value={value} target={target} unit={habit.unit} disabled={waiting} onSave={(next) => setCount(habit, next)} triggerClassName="w-fit text-left text-small font-bold text-ink tabular-nums hover:underline">
                {t("{done} of {total}", { done: count(value), total: amountLabel(target, habit.unit, t, fmt) })}
              </AmountPopover>
              <span className="block h-1.5 overflow-hidden rounded-full bg-line">
                <span className="block h-full" style={{ width: `${Math.min(100, (value / target) * 100)}%`, backgroundColor: categoryColorVar(habit.color) }} />
              </span>
            </span>
            <button type="button" onClick={() => setCount(habit, value + step)} disabled={waiting} aria-label={step === 1 ? t("One more: {name}", { name: habit.name }) : t("{count} more: {name}", { count: count(step), name: habit.name })} style={{ backgroundColor: categoryColorVar(habit.color) }} className="flex size-8.5 shrink-0 items-center justify-center rounded-[9px] text-surface disabled:opacity-60 pointer-coarse:size-11">
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <span role="img" aria-label={t("{name}: this week", { name: habit.name })} className="flex gap-1">
            {week.map((d) => {
              const mark = dayMark(habit, logs, d, today);
              // The day on show follows its log, a tap's included.
              const doneDay = d === day && log ? log.completed : mark === "done";
              const word = doneDay ? "done" : mark === "missed" ? "missed" : mark === "open" ? "still open" : mark === "future" ? "not yet" : "not planned";
              return (
                <span
                  key={d}
                  title={`${dayText(d, fmt, "short")}: ${t(word)}`}
                  style={doneDay ? { backgroundColor: categoryColorVar(habit.color) } : mark === "open" ? { borderColor: categoryColorVar(habit.color) } : undefined}
                  className={cn("size-3.5 rounded-[4px]", doneDay ? "" : mark === "missed" ? "bg-expense-soft" : mark === "open" ? "border-[1.5px] border-dashed" : "border-[1.5px] border-line bg-surface")}
                />
              );
            })}
          </span>
          <span className="flex items-center gap-2.5 text-[12.5px]">
            <span className="font-bold text-orange-fill">🔥 {streakText(habit, streak, t, fmt)}</span>
            <span className={cn("font-semibold tabular-nums", rate === null ? "text-ink-muted" : rate >= 80 ? "text-income" : "text-warning-ink")}>{rate === null ? "—" : `${count(rate)}%`}</span>
          </span>
        </div>
      </li>
    );
  };

  const dayLabel = isToday ? t("Today, {date}", { date: dayText(day, fmt, "short") }) : dayText(day, fmt, "short");

  return (
    <PageFrame className="gap-3.5 md:pt-7">
      <PageHeader
        title={t("Daily habits")}
        description={t("Tick them off as you go. Streaks build on their own.")}
        actions={
          <>
            <div role="group" aria-label={t("Day")} className="relative flex h-10 items-center overflow-hidden rounded-sm border border-input bg-surface pointer-coarse:h-11">
              <button type="button" onClick={() => goTo(shiftDay(day, -1))} aria-label={t("Previous day")} className="flex h-full w-9.5 items-center justify-center text-ink-soft hover:bg-surface-sunken pointer-coarse:w-11">
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={openPicker} aria-label={t("Pick a day: {day}", { day: dayText(day, fmt, "full") })} className="flex h-full min-w-37.5 items-center justify-center px-2.5 text-body font-semibold whitespace-nowrap text-ink hover:bg-surface-sunken">
                {dayLabel}
              </button>
              {/* The browser's own date picker; the button above opens it. */}
              <input ref={picker} type="date" value={day} max={today} onChange={(event) => event.target.value && event.target.value <= today && goTo(event.target.value)} aria-label={t("Pick a day: {day}", { day: dayText(day, fmt, "full") })} tabIndex={-1} className="sr-only" />
              <button type="button" disabled={isToday} onClick={() => goTo(shiftDay(day, 1))} aria-label={t("Next day")} className="flex h-full w-9.5 items-center justify-center text-ink-soft hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-35 pointer-coarse:w-11">
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
            {!isToday && (
              <Button variant="secondary" onClick={() => goTo(today)} className="rounded-sm pointer-coarse:h-11">
                {t("Back to today")}
              </Button>
            )}
            <Button variant="secondary" className="rounded-sm pointer-coarse:h-11" asChild>
              <Link href={`/habit-tracker/daily/report?month=${day.slice(0, 7)}`}>
                <ChartColumn strokeWidth={2} />
                {t("Monthly report")}
              </Link>
            </Button>
            <Button onClick={() => setDrawer({ open: true, editing: null })} className="rounded-sm pointer-coarse:h-11">
              <Plus strokeWidth={2.25} />
              {t("Add habit")}
            </Button>
          </>
        }
      />

      <section aria-label={isToday ? t("Today") : dayLabel} className="flex flex-wrap items-center gap-x-5.5 gap-y-3 rounded-[14px] bg-linear-to-br from-emerald to-forest px-5.5 py-4 text-white shadow-[0_8px_24px_rgba(15,118,110,0.25)] dark:text-on-action">
        <span role="img" aria-label={t("{pct}% done", { pct: count(pct) })} className="relative size-16 shrink-0">
          <svg viewBox="0 0 64 64" className="size-16 -rotate-90" aria-hidden="true">
            <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="6" />
            <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(pct / 100) * RING} ${RING}`} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[15px] font-bold tabular-nums">{count(pct)}%</span>
        </span>
        <div className="flex min-w-0 flex-1 basis-60 flex-col gap-0.75">
          <span className="text-[22px] leading-tight font-bold">{heroTitle}</span>
          <span className="text-small opacity-90">{heroSub}</span>
        </div>
        <div className="grid w-full grid-cols-3 gap-2.5 sm:w-auto">
          {chips.map((chip) => (
            <div key={chip.label} className="flex min-w-0 flex-col gap-px rounded-[12px] border border-white/20 bg-white/12 px-3.5 py-2.25 sm:w-32">
              <span className="truncate text-caption opacity-85">{chip.label}</span>
              <span className="truncate text-[19px] font-bold tabular-nums">{chip.value}</span>
            </div>
          ))}
        </div>
      </section>

      {habits.length === 0 ? (
        <EmptyState icon={<Check />} tone="habits" title={t("No habit yet")} description={t("Drink water, a morning walk, ten minutes of Quran: add the small things you want to repeat.")} action={<Button onClick={() => setDrawer({ open: true, editing: null })}>{t("Add habit")}</Button>} />
      ) : (
        <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section aria-labelledby="daily-habits-title" className="flex flex-col gap-3 rounded-[14px] border border-line-card bg-surface px-4 py-3.5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="daily-habits-title" className="text-[16px] font-semibold text-ink">
                {t("Your habits")}
              </h2>
              <SegmentedControl
                label={t("Show")}
                variant="pill"
                value={tab}
                onChange={setTab}
                options={[
                  { value: "all", label: `${t("All")} · ${count(active.length)}` },
                  { value: "todo", label: `${t("To do")} · ${count(open.length)}` },
                  { value: "done", label: `${t("Done")} · ${count(done.length)}` },
                ]}
              />
            </div>
            {active.length === 0 ? (
              <p className="py-8 text-center text-body text-ink-muted">{t("Every habit is archived. Bring one back below, or add a new one.")}</p>
            ) : shown.length === 0 ? (
              <p className="py-8 text-center text-body text-ink-muted">{t(tab === "todo" ? "Nothing left to do today 🎉" : "Nothing done yet. Tick a habit to start.")}</p>
            ) : (
              <ul className="grid gap-2.5 sm:grid-cols-2">{shown.map(card)}</ul>
            )}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 pt-1 text-[12.5px] text-ink-muted">
              <span>
                {t("Tap a card to see its month. Full month report:")}{" "}
                <Link href={`/habit-tracker/daily/report?month=${day.slice(0, 7)}`} className="font-semibold text-ink-soft underline hover:text-ink">
                  {t("Monthly report")}
                </Link>
                {". "}
                {t("🔥 is the streak, % is the last 30 days.")}
              </span>
              <button type="button" onClick={() => setArchiveOpen(true)} className="rounded-sm font-semibold text-ink-soft hover:text-ink">
                {t("Archived habits ({count})", { count: count(archived.length) })}
              </button>
            </div>
          </section>

          <div className="max-xl:hidden">{panel(false)}</div>
        </div>
      )}

      {/* Narrower than the board, the habit's month opens over the cards. */}
      <Sheet open={sheetOpen && !wide && selected !== null} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-xl border-0 bg-surface p-0 text-ink">
          <div className="mx-auto flex w-full max-w-xl flex-col">
            <SheetHeader className="flex-row items-center justify-between space-y-0 px-4 pt-3">
              <SheetTitle className="text-small font-semibold text-ink-muted">{t("This habit's month")}</SheetTitle>
              <CloseButton onClick={() => setSheetOpen(false)} label={t("Close")} />
            </SheetHeader>
            {panel(true)}
          </div>
        </SheetContent>
      </Sheet>

      <PopupDialog open={archiveOpen} onClose={() => setArchiveOpen(false)} width={460} title={t("Archived habits")} footer={<Button onClick={() => setArchiveOpen(false)}>{t("Done")}</Button>}>
        {archived.length === 0 ? (
          <p className="text-small text-ink-muted">{t("No archived habits.")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {archived.map((habit) => (
              <li key={habit.id} className="flex items-center justify-between gap-3 rounded-field border border-line px-3 py-2.5">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-body font-semibold text-ink">{habit.name}</span>
                  <span className="truncate text-caption text-ink-muted">{ruleLine(habit, t, fmt)}</span>
                </span>
                <Button variant="secondary" size="sm" onClick={() => restore(habit)} disabled={busy.has(habit.id)}>
                  <ArchiveRestore className="size-4" />
                  {t("Restore")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </PopupDialog>

      <HabitDrawer open={drawer.open} onClose={() => setDrawer({ open: false, editing: null })} editing={drawer.editing} reminders={reminders} />
    </PageFrame>
  );
}
