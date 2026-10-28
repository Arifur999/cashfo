"use client";

import { ArchiveRestore, Check, ChevronLeft, ChevronRight, Flame, Minus, Moon, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import EmptyState from "@/components/smartly/EmptyState";
import { ListCard, ListCell, ListEmpty, ListFooter, ListGroupRow, ListHead, ListHeadCell, ListRow, ListRowActions, ListRowButton } from "@/components/smartly/list";
import LoadMore from "@/components/smartly/LoadMore";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Habit } from "@/lib/customer/api";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { actionError, completionRate, countStep, countsOn, dayMark, dayText, habitStart, lastDays, perfectDays, plannedCount, ruleLabel, ruleLine, shiftDay, streakText, streakWord, WEEKDAY_INITIAL, weekdayOf, weekOf } from "@/lib/customer/habitDisplay";
import { checkInHabitAction, removeCheckInAction, updateHabitAction } from "@/lib/customer/habitsActions";
import { formatCount } from "@/lib/i18n/digits";
import { redigit } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AmountPopover } from "../Tracker/AmountPopover";
import { useReminderBook } from "../Reminders";
import { CloseButton } from "../Tracker/PanelParts";
import { StatCard } from "../Tracker/StatCard";
import type { DailyHabitsData } from "./dailyTypes";
import { HabitDetailPanel } from "./HabitDetailPanel";
import { HabitDrawer } from "./HabitDrawer";

// The board's columns: the week's seven 18px dots spread over 160px, the
// streak's 70px (its widest word is "weeks"), the 30 days' 56px, and
// Today's 140px, which holds "2 of 3 this week" and its tick.
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_160px_70px_56px_140px] md:gap-x-3.5";
const LIST_ID = "daily-habits";
// Two stat cards side by side on a phone are ~175px each: a tighter inset.
const STAT_PHONE = "max-md:px-4 max-md:py-3";
// A smaller figure on phones, so a Bangla "x of y" fits one line of a 2x2 tile.
const STAT_PHONE_VALUE = "max-md:text-h3";
// A long list grows 50 rows at a time.
const STEP = 50;
// The habit's month sits beside the list from 1400px. The row's fixed
// columns and inset take 548px, so any narrower and the 340px panel leaves
// the names no room (at 1280 the name column is under 45px); below it the
// month opens in a bottom sheet. Keep in step with the min-[1400px] and
// max-[1400px] classes below.
const SIDE_PANEL = "(min-width: 1400px)";

// A habit's log on the day shown: the server's, or a tap's until it lands.
type DayLog = { completed: boolean; value: number | null; note: string | null };

// Daily habits: every habit with its week, streak and 30-day rate, ticked
// off (or counted up) for the day being viewed, with one habit's month on
// the side (in a bottom sheet below 1400px, where the side has no room).
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
  const [showArchived, setShowArchived] = useState(false);
  const [shown, setShown] = useState(STEP);
  // Rows with a request in flight wait on their own; the others stay live.
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
  const resting = active.length - planned.length;
  const done = planned.filter((h) => logFor(h)?.completed);
  const open = planned.filter((h) => !logFor(h)?.completed);
  const week = weekOf(day, fmt);
  const last30 = lastDays(day, 30);
  const longest = [...active].map((h) => ({ habit: h, streak: streakOf(h) })).sort((a, b) => b.streak - a.streak)[0];
  const planned30 = active.reduce((sum, h) => sum + plannedCount(h, last30.filter((d) => d >= habitStart(h, logs)), fmt), 0);
  const done30 = logs.filter((l) => l.completed && last30.includes(l.date.slice(0, 10)) && active.some((h) => h.id === l.habitId)).length;
  const perfect = perfectDays(active, logs, last30);
  const selected = active.find((h) => h.id === selectedId) ?? planned[0] ?? active[0] ?? null;

  // A new day shows its own month in the panel.
  function goTo(nextDay: string) {
    router.push(nextDay === today ? "/habit-tracker/daily" : `/habit-tracker/daily?day=${nextDay}`);
  }

  // The panel's month alone; the day's list stays put.
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
      if (result.success) router.refresh();
      else toast.error(actionError(result.message, "Failed to check in", t, fmt));
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
      if (result.success) router.refresh();
      else toast.error(actionError(result.message, "Failed to bring the habit back", t, fmt));
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

  const openLine = (() => {
    if (planned.length === 0) return isToday ? t("Nothing planned today") : t("Nothing planned that day");
    if (open.length === 0) return t("Everything planned is done");
    if (open.length === 1) return t("{name} is still open", { name: open[0].name });
    if (open.length === 2) return t("{first} and {second} are still open", { first: open[0].name, second: open[1].name });
    return t("{first}, {second} and {count} more are still open", { first: open[0].name, second: open[1].name, count: count(open.length - 2) });
  })();
  const dayShort = dayText(day, fmt, "dayMonth");

  const visible = active.slice(0, shown);
  const panel = (inSheet: boolean) =>
    selected && (
      <HabitDetailPanel
        habit={selected}
        today={today}
        day={day}
        month={panelMonth}
        bestLogs={bestLogs}
        monthLogs={panelLogs}
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

  const row = (habit: Habit) => {
    const log = logFor(habit);
    const tone = categoryTone(habit.color);
    const rule = ruleLabel(habit, t, fmt);
    const counted = !!habit.targetValue;
    const target = habit.targetValue ?? 1;
    const step = countStep(target);
    const rest = !countsOn(habit, logs, day);
    const streak = streakOf(habit);
    const rate = completionRate(habit, logs, last30.filter((d) => d >= habitStart(habit, logs)), fmt);
    const on = !habit.isArchived && selected?.id === habit.id;
    // Marked only while its month can be seen: beside the list, or in the
    // sheet. Below 1400px the first habit is picked, not yet shown.
    const lit = on && (wide || sheetOpen);
    const value = log?.value ?? 0;
    const waiting = busy.has(habit.id);
    // "A few times a week": how the week stands, beside the tick (under the
    // name on a phone). The day on show counts by its tick, a tap's included.
    const weekDone = logs.filter((l) => l.habitId === habit.id && l.completed && l.date.slice(0, 10) !== day && week.includes(l.date.slice(0, 10))).length + (log?.completed ? 1 : 0);
    const weekly = habit.frequencyType === "WEEKLY_COUNT" && !habit.isArchived && !rest && !counted ? t("{done} of {total} this week", { done: count(weekDone), total: count(habit.weeklyCount ?? 1) }) : null;
    const name = (
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-body font-semibold text-ink">{habit.name}</span>
        <span className="truncate text-[12.5px] leading-[normal] text-ink-muted">
          {[ruleLine(habit, t, fmt), habit.isArchived ? t("archived") : null].filter(Boolean).join(" · ")}
        </span>
        {weekly && <span className="truncate text-caption text-ink-muted sm:hidden">{weekly}</span>}
      </span>
    );
    return (
      <ListRow key={habit.id} columns={COLUMNS} density="relaxed" selected={lit} muted={habit.isArchived} aria-busy={waiting || undefined}>
        {lit && <span aria-hidden="true" className={cn("absolute top-2.5 bottom-2.5 left-0 w-0.75 rounded-r-[3px] bg-current", tone.fg)} />}
        <ListCell className="flex min-w-0 items-center gap-3">
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-field [&_svg]:size-4.5", tone.bg, tone.fg)}>{createElement(budgetCategoryIcon(habit.icon), { "aria-hidden": true })}</span>
          {habit.isArchived ? (
            name
          ) : (
            // Beside the list the row picks the panel's habit (pressed or
            // not); narrower, it opens the month in a sheet.
            <ListRowButton aria-pressed={wide ? on : undefined} aria-haspopup={wide ? undefined : "dialog"} aria-label={t("Show {name}'s month", { name: habit.name })} onClick={() => select(habit)} className="min-w-0">
              {name}
            </ListRowButton>
          )}
        </ListCell>
        <ListCell className="hidden md:block">
          <span role="img" aria-label={t("{name}: this week", { name: habit.name })} className="flex justify-between px-0.5">
            {week.map((d) => {
              const mark = habit.isArchived ? "rest" : dayMark(habit, logs, d, today);
              // The day on show follows its log, a tap's included.
              const doneDay = d === day && log ? log.completed : mark === "done";
              return (
                <span key={d} title={`${dayText(d, fmt, "short")}: ${t(doneDay ? "done" : mark === "missed" ? "missed" : mark === "open" ? "still open" : mark === "future" ? "not yet" : "not planned")}`} className={cn("flex size-4.5 items-center justify-center rounded-full", doneDay ? cn("bg-current", tone.fg) : mark === "missed" ? "bg-expense-line" : mark === "open" ? cn("border-[1.5px] border-dashed border-current", tone.fg) : "border-[1.5px] border-line bg-surface")}>
                  {doneDay && <Check className="size-2.5 text-surface" strokeWidth={3} aria-hidden="true" />}
                </span>
              );
            })}
          </span>
        </ListCell>
        <ListCell className="hidden flex-col gap-px md:flex">
          <span className="flex items-center gap-1 text-body font-bold text-ink tabular-nums">
            <Flame className="size-3.25 text-orange-fill" aria-hidden="true" />
            {count(streak)}
          </span>
          <span className="text-[11.5px] leading-[normal] font-normal text-ink-muted">{t(streakWord(habit, streak))}</span>
        </ListCell>
        <ListCell align="end" className={cn("hidden text-body font-semibold tabular-nums md:block", rate === null ? "text-ink-muted" : rate >= 80 ? "text-income" : "text-warning")}>
          {rate === null ? "—" : `${count(rate)}%`}
        </ListCell>
        <ListRowActions>
          {habit.isArchived ? (
            <Button variant="outline" size="sm" onClick={() => restore(habit)} disabled={waiting} className="h-8 gap-1 px-3 text-small pointer-coarse:h-11">
              <ArchiveRestore className="size-4" />
              {t("Bring back")}
            </Button>
          ) : rest ? (
            <span title={rule.days} className="flex h-7.5 items-center gap-1.5 rounded-full bg-surface-sunken px-3 text-[12.5px] leading-[normal] font-semibold text-ink-soft">
              <Moon className="size-3.25 text-ink-muted" strokeWidth={2.25} aria-hidden="true" />
              {t("Rest day")}
            </span>
          ) : counted ? (
            <span className={cn("flex flex-col items-end gap-1", waiting && "opacity-70")}>
              <span className="flex items-center gap-1.5">
                <button type="button" onClick={() => setCount(habit, value - step)} disabled={waiting || value === 0} aria-label={step === 1 ? t("One less: {name}", { name: habit.name }) : t("{count} less: {name}", { count: count(step), name: habit.name })} className="flex size-7.5 items-center justify-center rounded-sm border border-input bg-surface text-ink-soft hover:bg-surface-sunken disabled:opacity-40 pointer-coarse:size-11">
                  <Minus className="size-3.5" aria-hidden="true" />
                </button>
                <AmountPopover name={habit.name} value={value} target={target} unit={habit.unit} disabled={waiting} onSave={(next) => setCount(habit, next)} triggerClassName="flex h-7.5 min-w-11 items-center justify-center px-1 text-center text-body font-bold text-ink pointer-coarse:h-11">
                  {count(value)} / {count(target)}
                </AmountPopover>
                <button type="button" onClick={() => setCount(habit, value + step)} disabled={waiting} aria-label={step === 1 ? t("One more: {name}", { name: habit.name }) : t("{count} more: {name}", { count: count(step), name: habit.name })} className={cn("flex size-7.5 items-center justify-center rounded-sm bg-current disabled:opacity-60 pointer-coarse:size-11", tone.fg)}>
                  <Plus className="size-3.5 text-surface" aria-hidden="true" />
                </button>
              </span>
              <span className={cn("block h-1 w-27.5 overflow-hidden rounded-full", tone.bg)}>
                <span className={cn("block h-full bg-current", tone.fg)} style={{ width: `${Math.min(100, (value / target) * 100)}%` }} />
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2.5">
              {weekly && <span className="text-caption font-normal whitespace-nowrap text-ink-muted max-sm:hidden">{weekly}</span>}
              <button type="button" onClick={() => toggle(habit)} disabled={waiting} aria-pressed={!!log?.completed} aria-label={log?.completed ? t("{name}, done. Tap to undo", { name: habit.name }) : t("Mark {name} as done", { name: habit.name })} className={cn("flex size-9 items-center justify-center rounded-full transition-colors pointer-coarse:size-11", log?.completed ? "bg-emerald text-on-action" : "border-[1.5px] border-input bg-surface text-ink-faint hover:border-emerald hover:text-emerald", waiting && "opacity-70")}>
                <Check className="size-4.5" strokeWidth={2.5} aria-hidden="true" />
              </button>
            </span>
          )}
        </ListRowActions>
      </ListRow>
    );
  };

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={t("Habits")}
        tone="habits"
        title={t("Daily habits")}
        description={t("Small things you repeat. Tick them off as you go and the streaks build on their own.")}
        actions={
          <>
            <div role="group" aria-label={t("Day")} className="relative flex h-10 items-center overflow-hidden rounded-sm border border-input bg-surface pointer-coarse:h-11">
              <button type="button" onClick={() => goTo(shiftDay(day, -1))} aria-label={t("Previous day")} className="flex h-full w-9.5 items-center justify-center text-ink-soft hover:bg-surface-sunken pointer-coarse:w-11">
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={openPicker} aria-label={t("Pick a day: {day}", { day: dayText(day, fmt, "full") })} className="flex h-full items-center px-2.5 text-body font-semibold whitespace-nowrap text-ink hover:bg-surface-sunken">
                {isToday ? t("Today, {date}", { date: dayText(day, fmt, "short") }) : dayText(day, fmt, "short")}
              </button>
              {/* The browser's own date picker; the button above opens it. */}
              <input ref={picker} type="date" value={day} max={today} onChange={(event) => event.target.value && event.target.value <= today && goTo(event.target.value)} aria-label={t("Pick a day: {day}", { day: dayText(day, fmt, "full") })} tabIndex={-1} className="sr-only" />
              <button type="button" disabled={isToday} onClick={() => goTo(shiftDay(day, 1))} aria-label={t("Next day")} className="flex h-full w-9.5 items-center justify-center text-ink-soft hover:bg-surface-sunken disabled:cursor-not-allowed disabled:text-input pointer-coarse:w-11">
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
            {!isToday && (
              <Button variant="secondary" onClick={() => goTo(today)} className="rounded-sm pointer-coarse:h-11">
                {t("Back to today")}
              </Button>
            )}
            <Button onClick={() => setDrawer({ open: true, editing: null })} className="rounded-sm pointer-coarse:h-11">
              <Plus strokeWidth={2.25} />
              {t("Add habit")}
            </Button>
          </>
        }
      />

      {/* Two by two on a phone, so the habits start on the first screen. */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard className={STAT_PHONE} valueClassName={STAT_PHONE_VALUE} label={isToday ? t("Done today") : t("Done on {date}", { date: dayShort })} value={t("{done} of {total}", { done: count(done.length), total: count(planned.length) })} sub={<span className="block truncate">{openLine}</span>} />
        <StatCard className={STAT_PHONE} valueClassName={STAT_PHONE_VALUE} label={t("Longest streak now")} value={longest && longest.streak > 0 ? streakText(longest.habit, longest.streak, t, fmt) : "—"} sub={<span className="block truncate">{longest && longest.streak > 0 ? longest.habit.name : t("Tick a habit two days running")}</span>} />
        <StatCard className={STAT_PHONE} valueClassName={STAT_PHONE_VALUE} label={redigit(t("Last 30 days"), fmt)} value={planned30 > 0 ? `${count(Math.min(100, Math.round((done30 / planned30) * 100)))}%` : "—"} sub={t("{done} of {total} planned check-ins", { done: count(done30), total: count(planned30) })} />
        <StatCard className={STAT_PHONE} valueClassName={STAT_PHONE_VALUE} label={t("Perfect days")} value={t("{done} of {total}", { done: count(perfect), total: count(30) })} sub={t("Every planned habit done")} />
      </div>

      {habits.length === 0 ? (
        <EmptyState icon={<Check />} tone="habits" title={t("No habit yet")} description={t("Drink water, a morning walk, ten minutes of Quran: add the small things you want to repeat.")} action={<Button onClick={() => setDrawer({ open: true, editing: null })}>{t("Add habit")}</Button>} />
      ) : (
        <div className="grid items-start gap-5 min-[1400px]:grid-cols-[minmax(0,1fr)_340px]">
          <ListCard
            id={LIST_ID}
            className="rounded-md"
            label={t("Your habits")}
            header={
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-3.5 md:px-5">
                <h2 className="text-title leading-[normal] font-semibold text-ink">{t("Your habits")}</h2>
                <span className="text-[12.5px] leading-[normal] text-ink-muted">
                  {[t(isToday ? "{count} planned today" : "{count} planned that day", { count: count(planned.length) }), resting > 0 ? t("{count} resting", { count: count(resting) }) : null].filter(Boolean).join(" · ")}
                </span>
              </div>
            }
            footer={
              <ListFooter>
                {active.length > STEP && <LoadMore shown={Math.min(shown, active.length)} total={active.length} step={STEP} onMore={() => setShown((value) => value + STEP)} onLess={shown >= active.length ? () => setShown(STEP) : undefined} focusTargetId={LIST_ID} />}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-caption font-normal text-ink-soft">
                    <span className="flex items-center gap-1">
                      <span className="size-2.5 rounded-full bg-emerald" /> {t("Done")}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2.5 rounded-full bg-expense-line" /> {t("Missed")}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2.5 rounded-full border-[1.5px] border-line bg-surface" /> {t("Not planned")}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2.5 rounded-full border-[1.5px] border-dashed border-line-strong" /> {t("Still open today")}
                    </span>
                  </span>
                  {archived.length > 0 && (
                    <button type="button" aria-expanded={showArchived} onClick={() => setShowArchived(!showArchived)} className="flex min-h-9 items-center text-small font-semibold text-ink-soft hover:text-ink pointer-coarse:min-h-11">
                      {showArchived ? t("Hide archived") : t("Archived habits ({count})", { count: count(archived.length) })}
                    </button>
                  )}
                </div>
              </ListFooter>
            }
          >
            <ListHead columns={COLUMNS}>
              <ListHeadCell>{t("Habit")}</ListHeadCell>
              <ListHeadCell aria-label={t("This week")} className="flex justify-between px-0.5">
                {week.map((d) => (
                  <span key={d} aria-hidden="true" className={cn("w-4.5 text-center", d === day && "font-bold text-emerald")}>
                    {t(WEEKDAY_INITIAL[weekdayOf(d)])}
                  </span>
                ))}
              </ListHeadCell>
              <ListHeadCell>{t("Streak")}</ListHeadCell>
              <ListHeadCell align="end">{t("{count} days", { count: count(30) })}</ListHeadCell>
              <ListHeadCell align="end">{isToday ? t("Today") : dayShort}</ListHeadCell>
            </ListHead>
            {active.length === 0 ? <ListEmpty icon={<Check />} tone="habits" title={t("No habit yet")} description={t("Every habit is archived. Bring one back below, or add a new one.")} action={<Button onClick={() => setDrawer({ open: true, editing: null })}>{t("Add habit")}</Button>} /> : visible.map(row)}
            {showArchived && archived.length > 0 && (
              <div role="rowgroup">
                <ListGroupRow label={t("Archived habits")} aside={count(archived.length)} className="border-t border-line" />
                {archived.map(row)}
              </div>
            )}
          </ListCard>

          <div className="max-[1400px]:hidden">{panel(false)}</div>
        </div>
      )}

      {/* Below 1400px the habit's month opens over the list, where it can be seen. */}
      <Sheet open={sheetOpen && !wide && selected !== null} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-xl border-0 bg-surface p-0 text-ink">
          {/* Laptops up to 1400px get the sheet too: its month keeps a panel's width, not the screen's. */}
          <div className="mx-auto flex w-full max-w-xl flex-col">
            <SheetHeader className="flex-row items-center justify-between space-y-0 px-4 pt-3">
              <SheetTitle className="text-small font-semibold text-ink-muted">{t("This habit's month")}</SheetTitle>
              <CloseButton onClick={() => setSheetOpen(false)} label={t("Close")} />
            </SheetHeader>
            {panel(true)}
          </div>
        </SheetContent>
      </Sheet>

      <HabitDrawer open={drawer.open} onClose={() => setDrawer({ open: false, editing: null })} editing={drawer.editing} reminders={reminders} />
    </PageFrame>
  );
}
