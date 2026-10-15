"use client";

import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { createElement, useState, useTransition } from "react";
import { toast } from "sonner";
import Card from "@/components/smartly/Card";
import Textarea from "@/components/smartly/form/Textarea";
import type { Habit, HabitMonthLog } from "@/lib/customer/api";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { formatDate } from "@/lib/customer/date";
import { shiftMonth } from "@/lib/customer/groupDisplay";
import { bestStreak, countTone, dayMark, isPlannedOn, monthGrid, ruleLabel, WEEK_START, WEEKDAY_SHORT } from "@/lib/customer/habitDisplay";
import { checkInHabitAction } from "@/lib/customer/habitsActions";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface HabitDetailPanelProps {
  habit: Habit;
  today: string;
  day: string;
  logs: HabitMonthLog[];
  streak: number;
  // Today's note, when the viewed day is today.
  note: string | null;
  todayLog: { completed: boolean; value: number | null } | null;
  onEdit: () => void;
  onMonthChange: (day: string) => void;
}

const MARK_CLASS = {
  done: "text-white",
  missed: "bg-expense-soft text-expense",
  open: "border-[1.5px] border-dashed border-line-strong text-ink-2",
  rest: "bg-surface text-ink-muted",
  future: "bg-surface text-ink-muted/60",
} as const;

// One habit's month: its streaks, every day of the month coloured, and a
// note for today.
export function HabitDetailPanel({ habit, today, day, logs, streak, note, todayLog, onEdit, onMonthChange }: HabitDetailPanelProps) {
  const { t, locale } = useLocale();
  const [draft, setDraft] = useState(note ?? "");
  const [savedFor, setSavedFor] = useState(`${habit.id}:${note ?? ""}`);
  const [isPending, startTransition] = useTransition();
  if (savedFor !== `${habit.id}:${note ?? ""}`) {
    setSavedFor(`${habit.id}:${note ?? ""}`);
    setDraft(note ?? "");
  }

  const tone = categoryTone(habit.color);
  const rule = ruleLabel(habit);
  const month = day.slice(0, 7);
  const [year, monthNumber] = month.split("-").map(Number);
  const cells = monthGrid(year, monthNumber);
  const monthDays = cells.filter((c): c is string => c !== null && c <= today);
  const monthLogs = logs.filter((l) => l.habitId === habit.id && l.date.slice(0, 7) === month);
  const doneThisMonth = monthDays.filter((d) => monthLogs.some((l) => l.completed && l.date.slice(0, 10) === d)).length;
  const plannedThisMonth = monthDays.filter((d) => isPlannedOn(habit, d) && d >= habit.createdAt.slice(0, 10)).length;
  const counted = !!habit.targetValue;
  const values = monthLogs.filter((l) => l.value !== null).map((l) => l.value as number);
  const average = values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;
  const best = Math.max(streak, bestStreak(habit, logs, today, 60));
  const rate = plannedThisMonth > 0 ? Math.round((doneThisMonth / plannedThisMonth) * 100) : null;

  const facts = [
    { label: t("Current streak"), value: `${streak} ${t(streak === 1 ? "day" : "days")}` },
    { label: t("Best streak"), value: `${best} ${t(best === 1 ? "day" : "days")}` },
    { label: monthName(month, locale), value: `${doneThisMonth} ${t("of")} ${plannedThisMonth} ${t("days")}` },
    counted ? { label: t("Daily average"), value: average === null ? "—" : `${average} ${habit.unit ?? ""}`.trim() } : { label: t("This month"), value: rate === null ? "—" : `${rate}%` },
  ];

  const canGoNext = month < today.slice(0, 7);
  const target = habit.targetValue ?? 0;

  function saveNote() {
    if (day !== today || draft === (note ?? "") || isPending) return;
    startTransition(async () => {
      const result = await checkInHabitAction(habit.id, { date: today, completed: todayLog?.completed ?? false, value: todayLog?.value ?? undefined, note: draft.trim() });
      if (result.success) toast.success(t("Note saved"));
      else toast.error(result.message ?? t("Failed to save the note"));
    });
  }

  return (
    <Card padding="none" className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <span className={cn("flex size-10.5 shrink-0 items-center justify-center rounded-md [&_svg]:size-5", tone.bg, tone.fg)}>{createElement(budgetCategoryIcon(habit.icon), { "aria-hidden": true })}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="truncate text-title font-semibold text-ink">{habit.name}</h2>
          <span className="truncate text-small text-ink-muted">
            {rule.amount ? `${rule.amount} ${t(rule.days === "Every day" ? "a day" : "")}`.trim() : t(rule.days)}
            {rule.amount && rule.days !== "Every day" ? ` · ${t(rule.days)}` : ""} · {t("added")} {formatDate(habit.createdAt, "d MMM")}
          </span>
        </span>
        <button type="button" onClick={onEdit} aria-label={`${t("Edit")} ${habit.name}`} className="flex size-8.5 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-ink-2 hover:bg-cream hover:text-ink">
          <Pencil className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {facts.map((fact) => (
          <div key={fact.label} className="flex flex-col gap-0.5 rounded-md bg-cream px-3 py-3">
            <span className="text-caption font-normal text-ink-muted">{fact.label}</span>
            <span className="text-title font-bold text-ink tabular-nums">{fact.value}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => onMonthChange(`${shiftMonth(month, -1)}-01`)} aria-label={monthName(shiftMonth(month, -1), locale)} className="flex size-7.5 items-center justify-center rounded-md text-ink-2 hover:bg-cream">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <span className="text-body font-semibold text-ink">{monthName(month, locale, "long", true)}</span>
          <button type="button" disabled={!canGoNext} onClick={() => onMonthChange(`${shiftMonth(month, 1)}-01`)} aria-label={monthName(shiftMonth(month, 1), locale)} className="flex size-7.5 items-center justify-center rounded-md text-ink-2 hover:bg-cream disabled:opacity-40">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-caption font-semibold text-ink-muted">
          {Array.from({ length: 7 }, (_, i) => (WEEK_START + i) % 7).map((d) => (
            <span key={d} className={cn(d === 5 && "text-warning")}>
              {t(WEEKDAY_SHORT[d]).slice(0, 2)}
            </span>
          ))}
        </div>
        <div role="grid" aria-label={`${habit.name}, ${monthName(month, locale)}`} className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell) return <span key={i} aria-hidden="true" className="h-9.5" />;
            const mark = dayMark(habit, logs, cell, today);
            const log = monthLogs.find((l) => l.date.slice(0, 10) === cell);
            const value = log?.value ?? null;
            const fill = counted && value !== null ? countTone(value, target) : null;
            const current = cell === day;
            return (
              <span
                key={cell}
                title={`${formatDate(cell, "d MMM")}: ${counted && value !== null ? `${value} ${habit.unit ?? ""}` : t(mark === "done" ? "done" : mark === "missed" ? "missed" : mark === "rest" ? "not planned" : mark === "open" ? "still open" : "not yet")}`}
                className={cn(
                  "flex h-9.5 flex-col items-center justify-center rounded-md text-caption font-semibold tabular-nums",
                  fill ? cn(tone.fg, fill === "full" ? "bg-current text-white" : fill === "near" ? "bg-current/45 text-white" : tone.bg) : mark === "done" ? cn("bg-current", tone.fg, MARK_CLASS.done) : MARK_CLASS[mark],
                  current && "ring-2 ring-emerald ring-offset-1 ring-offset-surface",
                )}
              >
                <span className={cn(fill === "full" || mark === "done" ? "text-white" : "")}>{Number(cell.slice(8))}</span>
                {counted && value !== null && <span className={cn("text-[11px] font-medium opacity-85", fill === "full" || fill === "near" ? "text-white" : "")}>{value}</span>}
              </span>
            );
          })}
        </div>
        {counted && (
          <div className="flex items-center justify-end gap-2 text-caption font-normal text-ink-muted">
            <span>{habit.unit ? `${habit.unit}:` : t("Amount:")}</span>
            <span className="flex items-center gap-1">
              <span className={cn("size-3 rounded-[3px]", tone.bg)} /> {t("under")} {Math.ceil(target * 0.75)}
            </span>
            <span className="flex items-center gap-1">
              <span className={cn("size-3 rounded-[3px] bg-current/45", tone.fg)} /> {Math.ceil(target * 0.75)}–{target - 1}
            </span>
            <span className="flex items-center gap-1">
              <span className={cn("size-3 rounded-[3px] bg-current", tone.fg)} /> {target} {t("or more")}
            </span>
          </div>
        )}
      </div>

      {day === today && (
        <div className="flex flex-col gap-2 border-t border-surface-sunken pt-4">
          <label htmlFor="hb-note" className="text-small font-semibold text-ink">
            {t("Note for today")} <span className="font-normal text-ink-muted">({t("optional")})</span>
          </label>
          <Textarea id="hb-note" rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={saveNote} maxLength={200} placeholder={t("How did it go?")} disabled={isPending} className="resize-none" />
        </div>
      )}
    </Card>
  );
}
