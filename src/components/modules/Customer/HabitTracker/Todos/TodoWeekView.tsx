"use client";

import { ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import { useState } from "react";
import type { TodoCategory } from "@/lib/customer/api";
import { timeLabel } from "@/lib/customer/date";
import { dayText, monthShort, WEEKDAY_SHORT, weekdayOf } from "@/lib/customer/habitDisplay";
import { type BoardTask, categoryOf, listName, ofText, percent, rangeText, sortTasks, stepCount, weekDays } from "@/lib/customer/todoBoard";
import { formatCount } from "@/lib/i18n/digits";
import { langOf } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ListFilterChip } from "./TodoSideColumn";
import { ProgressLine, TaskCheck } from "./TodoParts";
import { LIST_TONE, PRIORITY_LOOK } from "./todoTone";

interface TodoWeekViewProps {
  // Any day of the week shown.
  day: string;
  today: string;
  tasks: BoardTask[];
  categories: TodoCategory[];
  filter: TodoCategory | null;
  busy: Set<string>;
  popping: string | null;
  onClearFilter: () => void;
  onShift: (days: number) => void;
  onThisWeek: () => void;
  onOpenDay: (day: string) => void;
  onToggle: (task: BoardTask) => void;
  onOpen: (task: BoardTask) => void;
  // Resolves true once the task is on the day.
  onAdd: (day: string, text: string) => Promise<boolean>;
}

// The board's week (TodoWeek): seven columns from the reader's first day,
// each day's tasks as small cards (open first), a day's head opening it,
// and "+ Add" for a quick task on that day.
export function TodoWeekView({ day, today, tasks, categories, filter, busy, popping, onClearFilter, onShift, onThisWeek, onOpenDay, onToggle, onOpen, onAdd }: TodoWeekViewProps) {
  const { t, fmt } = useLocale();
  const days = weekDays(day, fmt);
  const [adding, setAdding] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const inWeek = tasks.filter((task) => task.day !== null && task.day >= days[0] && task.day <= days[6]);
  const done = inWeek.filter((task) => task.item.completed).length;
  const pct = percent(done, inWeek.length);
  const progress = t("{text} done", { text: ofText(done, inWeek.length, t, fmt) });
  const thisWeek = today >= days[0] && today <= days[6];

  async function add(on: string) {
    const words = text.trim();
    if (!words) {
      setAdding(null);
      return;
    }
    if (saving) return;
    setSaving(true);
    const added = await onAdd(on, words);
    setSaving(false);
    if (added) setText("");
  }

  return (
    <section aria-labelledby="todo-week-title" className="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-line bg-surface shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_-14px_rgba(15,23,42,0.12)] lg:flex-1">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <button type="button" onClick={() => onShift(-7)} aria-label={t("Previous week")} title={t("Previous week")} className="flex size-8 items-center justify-center rounded-sm border border-line bg-surface text-ink-muted hover:border-input hover:bg-surface-sunken hover:text-ink">
          <ChevronLeft className="size-4" strokeWidth={2} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onShift(7)} aria-label={t("Next week")} title={t("Next week")} className="flex size-8 items-center justify-center rounded-sm border border-line bg-surface text-ink-muted hover:border-input hover:bg-surface-sunken hover:text-ink">
          <ChevronRight className="size-4" strokeWidth={2} aria-hidden="true" />
        </button>
        <h2 id="todo-week-title" className="ml-1.5 text-[17px] leading-[normal] font-semibold whitespace-nowrap text-ink">
          {rangeText(days[0], days[6], t, fmt)}
        </h2>
        {!thisWeek && (
          <button type="button" onClick={onThisWeek} className="inline-flex h-7 items-center rounded-sm border border-emerald-line bg-emerald-soft px-2.75 text-[12.5px] font-semibold text-emerald hover:brightness-97">
            {t("This week")}
          </button>
        )}
        <span className="flex-1" />
        {filter && <ListFilterChip category={filter} onClear={onClearFilter} />}
        <span className="flex items-center gap-2.5 text-small whitespace-nowrap text-ink-soft">
          <b className="font-semibold text-ink">{progress}</b>
          <ProgressLine pct={pct} label={progress} />
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-x-auto sm:grid-cols-7 sm:grid-rows-[minmax(0,1fr)]">
        {days.map((date) => {
          const all = tasks.filter((task) => task.day === date);
          const open = sortTasks(all.filter((task) => !task.item.completed || task.item.id === popping));
          const closed = all.filter((task) => task.item.completed && task.item.id !== popping);
          const ticked = all.filter((task) => task.item.completed).length;
          const isToday = date === today;
          const friday = weekdayOf(date) === 5;
          const allDone = all.length > 0 && ticked === all.length;
          return (
            <div key={date} className={cn("flex min-h-0 min-w-0 flex-col border-r border-divider max-sm:border-b sm:min-w-34", isToday ? "bg-emerald-soft" : friday ? "bg-success-soft/25" : "bg-surface")}>
              <button type="button" onClick={() => onOpenDay(date)} title={t("Open this day")} className={cn("flex shrink-0 cursor-pointer items-center justify-between gap-1.5 border-b px-2.5 pt-2.5 pb-2.25 text-left", isToday ? "border-emerald-line" : "border-divider")}>
                <span className="flex min-w-0 flex-col gap-px">
                  <span className={cn("truncate text-[11.5px] leading-[normal] font-bold", isToday ? "text-emerald" : friday ? "text-success-ink" : "text-ink-muted")}>{isToday ? `${t("Today")} · ${t(WEEKDAY_SHORT[weekdayOf(date)])}` : t(WEEKDAY_SHORT[weekdayOf(date)])}</span>
                  <span className={cn("text-[18px] leading-[normal] font-bold whitespace-nowrap tabular-nums", isToday ? "text-emerald" : "text-ink")}>
                    {formatCount(Number(date.slice(8, 10)), fmt)} <span className="text-[11px] font-semibold text-ink-faint">{monthShort(Number(date.slice(5, 7)), langOf(fmt))}</span>
                  </span>
                </span>
                <span className={cn("inline-flex h-5 shrink-0 items-center rounded-full px-1.75 text-[11px] font-bold tabular-nums", allDone ? "bg-success-soft text-success-ink" : all.length ? "bg-surface-sunken text-ink-muted" : "text-ink-muted")}>{all.length ? `${formatCount(ticked, fmt)}/${formatCount(all.length, fmt)}` : "–"}</span>
              </button>
              <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2 [scrollbar-width:thin]">
                {[...open, ...closed].map((task) => {
                  const category = categoryOf(task.item, categories);
                  const steps = stepCount(task.item);
                  const checked = task.item.completed;
                  return (
                    <div key={task.item.id} className={cn("flex shrink-0 items-start gap-2 rounded-[9px] border border-l-3 border-line py-2 pr-2 pl-2.25 transition-shadow hover:shadow-[0_4px_12px_-6px_rgba(15,23,42,0.2)]", PRIORITY_LOOK[task.item.priority].bar, checked && task.item.id !== popping ? "bg-strip" : "bg-surface", busy.has(task.item.id) && "pointer-events-none opacity-60")}>
                      <span className="mt-px">
                        <TaskCheck size="sm" checked={checked} pop={task.item.id === popping} label={checked ? t("Mark as not done") : t("Mark as done")} onClick={() => onToggle(task)} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <button type="button" onClick={() => onOpen(task)} className={cn("line-clamp-2 cursor-pointer text-left text-[12.5px] leading-[1.35] font-medium hover:underline hover:underline-offset-3", checked ? "text-ink-faint line-through" : "text-ink")}>
                          {task.item.text}
                        </button>
                        <span className="flex items-center gap-1.5 overflow-hidden text-[11px] whitespace-nowrap text-ink-muted">
                          {category && <span aria-hidden="true" className={cn("size-1.75 shrink-0 rounded-[2px]", LIST_TONE[category.color].dot)} />}
                          {task.item.dueTime ? <span className="tabular-nums">{timeLabel(task.item.dueTime, t, fmt)}</span> : category && <span className="truncate">{listName(category, t)}</span>}
                          {task.item.repeat && <Repeat className="size-2.75 shrink-0 text-emerald" strokeWidth={2} aria-label={t("Repeats")} />}
                          {steps.total > 0 && (
                            <span className="tabular-nums">
                              {formatCount(steps.done, fmt)}/{formatCount(steps.total, fmt)}
                            </span>
                          )}
                        </span>
                      </span>
                    </div>
                  );
                })}
                {all.length === 0 && <span className="px-1 py-3.5 text-center text-caption text-ink-faint">{t("Free day")}</span>}
              </div>
              <div className="shrink-0 p-2">
                {adding === date ? (
                  <input
                    autoFocus
                    value={text}
                    maxLength={200}
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void add(date);
                      } else if (event.key === "Escape") {
                        event.stopPropagation();
                        setAdding(null);
                        setText("");
                      }
                    }}
                    onBlur={() => !text.trim() && setAdding(null)}
                    placeholder={t("New task, then Enter")}
                    aria-label={`${t("New task, then Enter")} · ${dayText(date, fmt, "short")}`}
                    className="h-8.5 w-full rounded-sm border border-input bg-surface px-2.25 text-small text-ink outline-none focus:border-emerald"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(date);
                      setText("");
                    }}
                    className="h-8 w-full cursor-pointer rounded-sm border border-dashed border-input text-[12.5px] font-semibold text-ink-muted hover:border-ink-faint hover:text-ink"
                  >
                    + {t("Add")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
