"use client";

import { ArchiveRestore, Check, ChevronLeft, ChevronRight, Flame, Minus, Moon, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import EmptyState from "@/components/smartly/EmptyState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { Habit } from "@/lib/customer/api";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { formatDate } from "@/lib/customer/date";
import { completionRate, dayMark, isPlannedOn, lastDays, perfectDays, plannedCount, ruleLabel, shiftDay, WEEK_START, WEEKDAY_SHORT, weekOf } from "@/lib/customer/habitDisplay";
import { checkInHabitAction, removeCheckInAction, updateHabitAction } from "@/lib/customer/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { DailyHabitsData } from "./dailyTypes";
import { HabitDetailPanel } from "./HabitDetailPanel";
import { HabitDrawer } from "./HabitDrawer";

const ROW = "md:grid-cols-[minmax(0,1fr)_160px_70px_56px_140px]";

// Daily habits: every habit with its week, streak and 30-day rate, ticked
// off (or counted up) for the day being viewed, with one habit's month on
// the side.
export function DailyHabitsPageClient({ data }: { data: DailyHabitsData }) {
  const { t } = useLocale();
  const router = useRouter();
  const { today, day, habits, todayRows, stats, logs } = data;
  const isToday = day === today;
  const active = habits.filter((h) => !h.isArchived);
  const archived = habits.filter((h) => h.isArchived);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ open: boolean; editing: Habit | null }>({ open: false, editing: null });
  const [showArchived, setShowArchived] = useState(false);
  const [isPending, startTransition] = useTransition();

  const logFor = (habit: Habit) => {
    if (isToday) {
      const row = todayRows.find((r) => r.id === habit.id);
      return row?.todayLog ? { completed: row.todayLog.completed, value: row.todayLog.value, note: row.todayLog.note } : null;
    }
    const log = logs.find((l) => l.habitId === habit.id && l.date.slice(0, 10) === day);
    return log ? { completed: log.completed, value: log.value, note: null } : null;
  };
  const streakOf = (habit: Habit) => todayRows.find((r) => r.id === habit.id)?.streak ?? stats.find((s) => s.habitId === habit.id)?.currentStreak ?? 0;

  const planned = active.filter((h) => isPlannedOn(h, day) && day >= h.createdAt.slice(0, 10));
  const resting = active.length - planned.length;
  const done = planned.filter((h) => logFor(h)?.completed);
  const open = planned.filter((h) => !logFor(h)?.completed);
  const week = weekOf(day);
  const last30 = lastDays(day, 30);
  const longest = [...active].map((h) => ({ habit: h, streak: streakOf(h) })).sort((a, b) => b.streak - a.streak)[0];
  const planned30 = active.reduce((sum, h) => sum + plannedCount(h, last30.filter((d) => d >= h.createdAt.slice(0, 10))), 0);
  const done30 = logs.filter((l) => l.completed && last30.includes(l.date.slice(0, 10)) && active.some((h) => h.id === l.habitId)).length;
  const perfect = perfectDays(active, logs, last30);
  const selected = active.find((h) => h.id === selectedId) ?? planned[0] ?? active[0] ?? null;

  function goTo(nextDay: string) {
    router.push(nextDay === today ? "/habit-tracker/daily" : `/habit-tracker/daily?day=${nextDay}`);
  }

  function run(action: () => Promise<{ success: boolean; message?: string }>, failed: string) {
    startTransition(async () => {
      const result = await action();
      if (result.success) router.refresh();
      else toast.error(result.message ?? failed);
    });
  }

  const toggle = (habit: Habit) => {
    const log = logFor(habit);
    run(() => (log?.completed ? removeCheckInAction(habit.id, day) : checkInHabitAction(habit.id, { date: day, completed: true })), t("Failed to check in"));
  };
  const count = (habit: Habit, delta: number) => {
    const log = logFor(habit);
    const next = Math.max(0, (log?.value ?? 0) + delta);
    const target = habit.targetValue ?? 0;
    run(() => (next === 0 ? removeCheckInAction(habit.id, day) : checkInHabitAction(habit.id, { date: day, value: next, completed: next >= target, note: log?.note ?? undefined })), t("Failed to check in"));
  };
  const restore = (habit: Habit) => run(() => updateHabitAction(habit.id, { isArchived: false }), t("Failed to bring the habit back"));

  const statCards = [
    { label: t("Done today"), value: `${done.length} ${t("of")} ${planned.length}`, sub: planned.length === 0 ? t("Nothing planned today") : open.length === 0 ? t("Everything planned is done") : `${open.slice(0, 2).map((h) => h.name).join(` ${t("and")} `)} ${t(open.length === 1 ? "is still open" : "are still open")}` },
    { label: t("Longest streak now"), value: longest && longest.streak > 0 ? `${longest.streak} ${t(longest.streak === 1 ? "day" : "days")}` : "—", sub: longest && longest.streak > 0 ? longest.habit.name : t("Tick a habit two days running") },
    { label: t("Last 30 days"), value: planned30 > 0 ? `${Math.min(100, Math.round((done30 / planned30) * 100))}%` : "—", sub: `${done30} ${t("of")} ${planned30} ${t("planned check-ins")}` },
    { label: t("Perfect days"), value: `${perfect} ${t("of")} 30`, sub: t("Every planned habit done") },
  ];

  const rows = showArchived ? [...active, ...archived] : active;

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={t("Habits")}
        tone="habits"
        title={t("Daily habits")}
        description={t("Small things you repeat. Tick them off as you go and the streaks build on their own.")}
        actions={
          <>
            <div role="group" aria-label={t("Day")} className="flex h-10 items-center overflow-hidden rounded-md border border-line-strong bg-surface">
              <button type="button" onClick={() => goTo(shiftDay(day, -1))} aria-label={t("Previous day")} className="flex size-9.5 items-center justify-center text-ink-2 hover:bg-cream">
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <span className="px-3 text-body font-semibold whitespace-nowrap text-ink">{isToday ? `${t("Today")}, ` : ""}{formatDate(day, "EEE d MMM")}</span>
              <button type="button" disabled={isToday} onClick={() => goTo(shiftDay(day, 1))} aria-label={t("Next day")} className="flex size-9.5 items-center justify-center text-ink-2 hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
            <Button onClick={() => setDrawer({ open: true, editing: null })}>
              <Plus strokeWidth={2.25} />
              {t("Add habit")}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} padding="none" className="flex flex-col gap-1 px-5 py-4">
            <span className="text-small font-medium text-ink-muted">{card.label}</span>
            <span className="text-[22px] leading-7 font-bold tracking-tight text-ink tabular-nums">{card.value}</span>
            <span className="truncate text-caption font-normal text-ink-muted">{card.sub}</span>
          </Card>
        ))}
      </div>

      {active.length === 0 ? (
        <EmptyState icon={<Check />} tone="habits" title={t("No habit yet")} description={t("Drink water, a morning walk, ten minutes of Quran: add the small things you want to repeat.")} action={<Button onClick={() => setDrawer({ open: true, editing: null })}>{t("Add habit")}</Button>} />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card padding="none" className="overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-title font-semibold text-ink">{t("Your habits")}</h2>
              <span className="text-small text-ink-muted">
                {planned.length} {t("planned today")}
                {resting > 0 ? ` · ${resting} ${t("resting")}` : ""}
              </span>
            </div>
            <div className={cn("hidden items-center gap-4 border-y border-line bg-cream px-5 py-2 text-caption font-medium text-ink-muted md:grid", ROW)}>
              <span>{t("Habit")}</span>
              <span className="flex justify-between px-0.5">
                {week.map((d) => (
                  <span key={d} className={cn("w-4.5 text-center", d === day && "font-bold text-emerald")}>
                    {t(WEEKDAY_SHORT[(WEEK_START + week.indexOf(d)) % 7]).slice(0, 1)}
                  </span>
                ))}
              </span>
              <span>{t("Streak")}</span>
              <span className="text-right">30 {t("days")}</span>
              <span className="text-right">{isToday ? t("Today") : formatDate(day, "d MMM")}</span>
            </div>
            {rows.map((habit) => {
              const log = logFor(habit);
              const tone = categoryTone(habit.color);
              const rule = ruleLabel(habit);
              const counted = !!habit.targetValue;
              const rest = !isPlannedOn(habit, day) || day < habit.createdAt.slice(0, 10);
              const streak = streakOf(habit);
              const rate = completionRate(habit, logs, last30.filter((d) => d >= habit.createdAt.slice(0, 10)));
              const on = selected?.id === habit.id;
              const value = log?.value ?? 0;
              return (
                <div key={habit.id} role="button" tabIndex={0} onClick={() => setSelectedId(habit.id)} onKeyDown={(event) => event.key === "Enter" && setSelectedId(habit.id)} className={cn("relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-surface-sunken px-5 py-3 text-left transition-colors last:border-b-0 md:min-h-17 md:gap-4 md:py-0", ROW, on ? "bg-mint-50/60" : "hover:bg-cream/60", habit.isArchived && "opacity-60")}>
                  {on && <span aria-hidden="true" className="absolute top-2.5 bottom-2.5 left-0 w-0.75 rounded-r-[3px] bg-emerald" />}
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md [&_svg]:size-4.5", tone.bg, tone.fg)}>{createElement(budgetCategoryIcon(habit.icon), { "aria-hidden": true })}</span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-body font-semibold text-ink">{habit.name}</span>
                      <span className="truncate text-small text-ink-muted">
                        {t(rule.days)}
                        {rule.amount ? ` · ${rule.amount}` : ""}
                        {habit.isArchived ? ` · ${t("archived")}` : ""}
                      </span>
                    </span>
                  </span>
                  <span role="img" aria-label={`${habit.name}: ${t("this week")}`} className="hidden justify-between px-0.5 md:flex">
                    {week.map((d) => {
                      const mark = habit.isArchived ? "rest" : dayMark(habit, logs, d, today);
                      const doneDay = mark === "done" || (d === day && !!log?.completed);
                      return (
                        <span key={d} title={`${formatDate(d, "EEE d")}: ${t(doneDay ? "done" : mark === "missed" ? "missed" : mark === "open" ? "still open" : mark === "future" ? "not yet" : "not planned")}`} className={cn("flex size-4.5 items-center justify-center rounded-full", doneDay ? cn("bg-current", tone.fg) : mark === "missed" ? "bg-expense-soft" : mark === "open" ? cn("border-[1.5px] border-dashed", tone.fg) : "border-[1.5px] border-line bg-surface")}>
                          {doneDay && <Check className="size-2.5 text-white" strokeWidth={3} aria-hidden="true" />}
                        </span>
                      );
                    })}
                  </span>
                  <span className="hidden flex-col gap-px md:flex">
                    <span className="flex items-center gap-1 text-body font-bold text-ink tabular-nums">
                      <Flame className="size-3.5 text-pillar-loans" aria-hidden="true" />
                      {streak}
                    </span>
                    <span className="text-caption font-normal text-ink-muted">{t(streak === 1 ? "day" : "days")}</span>
                  </span>
                  <span className={cn("hidden text-right text-body font-semibold tabular-nums md:block", rate === null ? "text-ink-muted" : rate >= 80 ? "text-income" : "text-warning")}>{rate === null ? "—" : `${rate}%`}</span>
                  <span className="flex justify-end" onClick={(event) => event.stopPropagation()}>
                    {habit.isArchived ? (
                      <Button variant="outline" size="sm" onClick={() => restore(habit)} disabled={isPending} className="h-8 gap-1 px-3 text-small">
                        <ArchiveRestore className="size-4" />
                        {t("Bring back")}
                      </Button>
                    ) : rest ? (
                      <span title={t(rule.days)} className="flex h-7.5 items-center gap-2 rounded-full bg-surface-sunken px-3 text-small font-semibold text-ink-2">
                        <Moon className="size-3.5" aria-hidden="true" />
                        {t("Rest day")}
                      </span>
                    ) : counted ? (
                      <span className="flex flex-col items-end gap-1">
                        <span className="flex items-center gap-2">
                          <button type="button" onClick={() => count(habit, -1)} disabled={isPending || value === 0} aria-label={`${t("One less")} ${habit.unit ?? ""}`} className="flex size-7.5 items-center justify-center rounded-md border border-line-strong bg-surface text-ink-2 hover:bg-cream disabled:opacity-40">
                            <Minus className="size-3.5" aria-hidden="true" />
                          </button>
                          <span className="min-w-11 text-center text-body font-bold text-ink tabular-nums">
                            {value} / {habit.targetValue}
                          </span>
                          <button type="button" onClick={() => count(habit, 1)} disabled={isPending} aria-label={`${t("One more")} ${habit.unit ?? ""}`} className={cn("flex size-7.5 items-center justify-center rounded-md bg-current text-white disabled:opacity-60", tone.fg)}>
                            <Plus className="size-3.5 text-white" aria-hidden="true" />
                          </button>
                        </span>
                        <span className={cn("block h-1 w-27.5 overflow-hidden rounded-full", tone.bg)}>
                          <span className={cn("block h-full bg-current", tone.fg)} style={{ width: `${Math.min(100, (value / (habit.targetValue ?? 1)) * 100)}%` }} />
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-3">
                        {habit.frequencyType === "WEEKLY_COUNT" && <span className="text-caption font-normal whitespace-nowrap text-ink-muted">{t("this week")}: {logs.filter((l) => l.habitId === habit.id && l.completed && week.includes(l.date.slice(0, 10))).length} {t("of")} {habit.weeklyCount}</span>}
                        <button type="button" onClick={() => toggle(habit)} disabled={isPending} aria-pressed={!!log?.completed} aria-label={log?.completed ? `${habit.name} ${t("is done. Tap to undo")}` : `${t("Mark")} ${habit.name} ${t("as done")}`} className={cn("flex size-9 items-center justify-center rounded-full transition-colors", log?.completed ? "bg-emerald text-white" : "border-[1.5px] border-line-strong bg-surface text-ink-muted hover:border-emerald hover:text-emerald")}>
                          <Check className="size-4.5" strokeWidth={2.5} aria-hidden="true" />
                        </button>
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-small">
              <span className="flex flex-wrap items-center gap-4 text-caption font-normal text-ink-2">
                <span className="flex items-center gap-1">
                  <span className="size-2.5 rounded-full bg-emerald" /> {t("Done")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2.5 rounded-full bg-expense-soft" /> {t("Missed")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2.5 rounded-full border-[1.5px] border-line bg-surface" /> {t("Not planned")}
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2.5 rounded-full border-[1.5px] border-dashed border-line-strong" /> {t("Still open today")}
                </span>
              </span>
              {archived.length > 0 && (
                <button type="button" onClick={() => setShowArchived(!showArchived)} className="font-semibold text-ink-2 hover:text-ink">
                  {showArchived ? t("Hide archived") : `${t("Archived habits")} (${archived.length})`}
                </button>
              )}
            </div>
          </Card>

          {selected && (
            <HabitDetailPanel
              habit={selected}
              today={today}
              day={day}
              logs={logs}
              streak={streakOf(selected)}
              note={isToday ? (logFor(selected)?.note ?? null) : null}
              todayLog={isToday ? logFor(selected) : null}
              onEdit={() => setDrawer({ open: true, editing: selected })}
              onMonthChange={(firstDay) => goTo(firstDay > today ? today : firstDay)}
            />
          )}
        </div>
      )}

      <HabitDrawer open={drawer.open} onClose={() => setDrawer({ open: false, editing: null })} editing={drawer.editing} />
    </PageFrame>
  );
}
