"use client";

import { Info, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import ChoiceCard from "@/components/smartly/ChoiceCard";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import TimeInput from "@/components/smartly/form/TimeInput";
import WeekdayPicker from "@/components/smartly/WeekdayPicker";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { TodoItem, TodoPriority, TodoRepeatKind } from "@/lib/customer/api";
import { shiftDay, weekdayOf } from "@/lib/customer/habitDisplay";
import { dayOfMonthWord, PRIORITIES, PRIORITY_LABEL, repeatLabel } from "@/lib/customer/todoDisplay";
import type { TodoItemChanges } from "@/lib/customer/todosActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PRIORITY_TONE, PriorityDot } from "./TaskBits";

type RepeatChoice = "NONE" | TodoRepeatKind;

interface TaskDrawerProps {
  item: TodoItem | null;
  // The day the task is listed on, "YYYY-MM-DD".
  day: string;
  today: string;
  isPending: boolean;
  onClose: () => void;
  // Only what changed is sent.
  onSave: (item: TodoItem, changes: TodoItemChanges) => void;
  onDelete: (item: TodoItem) => void;
}

const sameDays = (a: number[], b: number[]) => a.length === b.length && a.every((day) => b.includes(day));

// The board's Edit task drawer: the words, the day and time, the priority,
// and whether the task repeats.
export function TaskDrawer({ item, day, today, isPending, onClose, onSave, onDelete }: TaskDrawerProps) {
  const { t, locale } = useLocale();
  const wide = useMediaQuery("(min-width: 768px)");
  const [text, setText] = useState("");
  const [date, setDate] = useState(day);
  const [time, setTime] = useState<string | null>(null);
  const [priority, setPriority] = useState<TodoPriority>("MEDIUM");
  const [repeat, setRepeat] = useState<RepeatChoice>("NONE");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const textField = useRef<HTMLInputElement>(null);

  // Fill the form each time a task opens.
  const [prevId, setPrevId] = useState<string | null>(null);
  if ((item?.id ?? null) !== prevId) {
    setPrevId(item?.id ?? null);
    if (item) {
      setText(item.text);
      setDate(day);
      setTime(item.dueTime);
      setPriority(item.priority);
      setRepeat(item.repeat?.kind ?? "NONE");
      setWeekdays(item.repeat?.weekdays.length ? item.repeat.weekdays : [weekdayOf(day)]);
    }
  }

  const valid = text.trim().length > 0 && (repeat !== "WEEKLY" || weekdays.length > 0);
  const quick = [
    { label: "Today", value: today },
    { label: "Tomorrow", value: shiftDay(today, 1) },
    { label: "Next week", value: shiftDay(today, 7) },
  ];
  const monthDay = Number(date.slice(8, 10));
  const options: { value: RepeatChoice; title: string; sub?: string }[] = [
    { value: "NONE", title: "Doesn't repeat" },
    { value: "DAILY", title: "Every day" },
    { value: "WEEKLY", title: "On certain days", sub: weekdays.length ? repeatLabel({ kind: "WEEKLY", weekdays, monthDay: null }, t, locale, true) : undefined },
    { value: "MONTHLY", title: "Every month", sub: t("on the {day}", { day: dayOfMonthWord(monthDay, locale) }) },
  ];

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!item || !valid || isPending) return;
    const changes: TodoItemChanges = {};
    if (text.trim() !== item.text) changes.text = text.trim();
    if (date !== day) changes.date = date;
    if (time !== item.dueTime) changes.dueTime = time;
    if (priority !== item.priority) changes.priority = priority;
    const was = item.repeat;
    if (repeat === "NONE") {
      if (was) changes.repeat = null;
    } else if (!was || was.kind !== repeat || (repeat === "WEEKLY" && !sameDays(was.weekdays, weekdays)) || (repeat === "MONTHLY" && date !== day)) {
      changes.repeat = repeat === "WEEKLY" ? { kind: repeat, weekdays: [...weekdays].sort((a, b) => a - b) } : { kind: repeat };
    }
    if (Object.keys(changes).length === 0) onClose();
    else onSave(item, changes);
  }

  const label = (words: React.ReactNode) => <span className="text-body font-medium text-ink">{words}</span>;

  return (
    <Sheet open={item !== null} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        // The task's words take the focus, as the board shows, not the close button.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          textField.current?.focus();
        }}
        className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-115 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] data-[side=right]:sm:max-w-115" : "rounded-t-xl data-[side=bottom]:max-h-[92vh]")}>
        <SheetHeader className={cn("flex-row items-center justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <SheetTitle className="text-h3 text-ink">{t("Edit task")}</SheetTitle>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <Field htmlFor="task-text" label={label(t("Task"))}>
              <Input ref={textField} id="task-text" size="md" value={text} onChange={(event) => setText(event.target.value)} maxLength={200} />
            </Field>

            <div className="grid grid-cols-[minmax(0,1fr)_150px] gap-3">
              <Field htmlFor="task-date" label={label(t("Date"))}>
                <DayInput id="task-date" value={date} onChange={setDate} />
              </Field>
              <Field
                htmlFor="task-time"
                label={label(
                  <>
                    {t("Time")} <span className="font-normal text-ink-muted">({t("optional")})</span>
                  </>,
                )}
              >
                <TimeInput id="task-time" value={time} onChange={setTime} placeholder={t("Any time")} />
              </Field>
            </div>
            <div className="-mt-2 flex flex-wrap gap-2">
              {quick.map((option) => {
                const on = date === option.value;
                return (
                  <button key={option.label} type="button" aria-pressed={on} onClick={() => setDate(option.value)} className={cn("h-7 rounded-full border px-3 text-small font-semibold transition-colors", on ? "border-emerald bg-mint-50 text-emerald" : "border-line bg-surface text-ink-2 hover:border-line-strong")}>
                    {t(option.label)}
                  </button>
                );
              })}
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-body font-medium text-ink">{t("Priority")}</legend>
              <div role="radiogroup" aria-label={t("Priority")} className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((option) => {
                  const on = priority === option;
                  return (
                    <button key={option} type="button" role="radio" aria-checked={on} onClick={() => setPriority(option)} className={cn("flex h-10.5 items-center justify-center gap-2 rounded-md text-body font-semibold transition-colors", on ? cn("border-[1.5px]", PRIORITY_TONE[option].on) : "border border-line bg-surface text-ink-2 hover:border-line-strong")}>
                      <PriorityDot priority={option} className="size-2" />
                      {t(PRIORITY_LABEL[option])}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-body font-medium text-ink">{t("Repeat")}</legend>
              {options.map((option) => (
                <ChoiceCard key={option.value} checked={repeat === option.value} onSelect={() => setRepeat(option.value)} title={t(option.title)} sub={option.sub} subPlacement="inline">
                  {option.value === "WEEKLY" && <WeekdayPicker value={weekdays} onChange={setWeekdays} labels="long" className="pl-8" />}
                </ChoiceCard>
              ))}
            </fieldset>

            <p className="flex gap-3 rounded-md border border-line bg-strip px-4 py-3 text-small leading-normal text-ink-2">
              <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              {t("A repeating task shows up on its days by itself. Ticking it off finishes only that day.")}
            </p>
          </div>

          <div className={cn("flex items-center gap-3 border-t border-line bg-strip", wide ? "px-6 py-4" : "px-4 py-3")}>
            {item && (
              <Button type="button" variant="ghost" onClick={() => onDelete(item)} disabled={isPending} className="px-3 text-expense hover:bg-expense-soft hover:text-expense">
                <Trash2 />
                {t("Delete")}
              </Button>
            )}
            <span className="flex-1" />
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="action" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader />}
              {t("Save changes")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
