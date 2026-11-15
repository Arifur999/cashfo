"use client";

import { CalendarDays, ChevronDown, Clock, Info, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import Loader from "@/components/shared/Loader";
import WeekdayPicker from "@/components/smartly/WeekdayPicker";
import type { TodoCategory, TodoItem, TodoPriority, TodoRepeatKind, TodoStep } from "@/lib/customer/api";
import { dayText, shiftDay, WEEKDAY_LONG, weekdayOf } from "@/lib/customer/habitDisplay";
import { type BoardTask, categoryOf, listName, ofText } from "@/lib/customer/todoBoard";
import { dayOfMonthWord, PRIORITIES, PRIORITY_LABEL } from "@/lib/customer/todoDisplay";
import type { NewTask, TodoItemChanges } from "@/lib/customer/todosActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { RemindBeforeSelect, ReminderPushHint } from "../Reminders";
import { DateOverlay, TaskCheck, TimeOptions } from "./TodoParts";
import { LIST_TONE, PRIORITY_LOOK } from "./todoTone";

type RepeatChoice = "NONE" | TodoRepeatKind;

// What a new task's popup starts with (the quick add's More passes what was typed).
export interface TaskDraft {
  text?: string;
  day: string | null;
  priority?: TodoPriority;
  dueTime?: string | null;
  categoryId?: string | null;
}

interface TodoTaskDialogProps {
  // The task being edited, or a new one's starting values; null = closed.
  editing: BoardTask | null;
  draft: TaskDraft | null;
  categories: TodoCategory[];
  today: string;
  busy: boolean;
  onClose: () => void;
  onAdd: (task: NewTask) => Promise<boolean>;
  onSave: (task: BoardTask, changes: TodoItemChanges) => Promise<boolean>;
  onDelete: (task: BoardTask) => void;
}

const LABEL = "text-[13.5px] leading-[normal] font-semibold text-ink";
const FIELD = "w-full rounded-sm border bg-surface px-3 text-body text-ink outline-none focus:border-emerald focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--emerald)_15%,transparent)]";
const sameDays = (a: number[], b: number[]) => a.length === b.length && a.every((day) => b.includes(day));
const sameSteps = (a: TodoStep[], b: TodoStep[]) => a.length === b.length && a.every((step, i) => step.text === b[i].text && step.done === b[i].done);

// The board's task popup (TodoNewTask / TodoTaskDrawer): the words, the day
// with quick picks and the time, the reminder, priority, list, how it
// repeats, smaller steps and a note. Only the task is needed.
export function TodoTaskDialog({ editing, draft, categories, today, busy, onClose, onAdd, onSave, onDelete }: TodoTaskDialogProps) {
  const { t, fmt } = useLocale();
  const open = editing !== null || draft !== null;
  const item: TodoItem | null = editing?.item ?? null;
  const [text, setText] = useState("");
  const [day, setDay] = useState<string | null>(today);
  const [dueTime, setDueTime] = useState<string | null>(null);
  const [remindBefore, setRemindBefore] = useState<number | null>(null);
  const [priority, setPriority] = useState<TodoPriority>("MEDIUM");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [repeat, setRepeat] = useState<RepeatChoice>("NONE");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [steps, setSteps] = useState<TodoStep[]>([]);
  const [stepDraft, setStepDraft] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ text?: string; repeat?: string }>({});
  // A save on its way: one press, one task.
  const [saving, setSaving] = useState(false);
  const locked = busy || saving;
  const textField = useRef<HTMLInputElement>(null);
  const stepField = useRef<HTMLInputElement>(null);

  // Fill the form each time it opens (a task, or a new one's draft).
  const key = editing ? `edit:${editing.item.id}` : draft ? `new:${draft.day ?? ""}:${draft.text ?? ""}` : null;
  const [prevKey, setPrevKey] = useState<string | null>(null);
  if (key !== prevKey) {
    setPrevKey(key);
    if (editing) {
      const it = editing.item;
      setText(it.text);
      setDay(editing.day);
      setDueTime(it.dueTime);
      setRemindBefore(it.remindBefore ?? null);
      setPriority(it.priority);
      setCategoryId(categoryOf(it, categories)?.id ?? null);
      setRepeat(it.repeat?.kind ?? "NONE");
      setWeekdays(it.repeat?.weekdays.length ? it.repeat.weekdays : editing.day ? [weekdayOf(editing.day)] : []);
      setSteps(it.steps);
      setNote(it.note);
    } else if (draft) {
      setText(draft.text ?? "");
      setDay(draft.day);
      setDueTime(draft.dueTime ?? null);
      setRemindBefore(null);
      setPriority(draft.priority ?? "MEDIUM");
      setCategoryId(draft.categoryId ?? categoryOf({ categoryId: null }, categories)?.id ?? null);
      setRepeat("NONE");
      setWeekdays(draft.day ? [weekdayOf(draft.day)] : []);
      setSteps([]);
      setNote("");
    }
    setStepDraft("");
    setErrors({});
  }

  const tomorrow = shiftDay(today, 1);
  const pill = day === today ? { text: t("Today"), className: "bg-success-soft text-success-ink" } : day === tomorrow ? { text: t("Tomorrow"), className: "bg-sky-soft text-sky" } : day && day < today ? { text: t("Past"), className: "bg-expense-soft text-expense" } : null;
  const quick: { key: string; label: string; value: string | null }[] = [
    { key: "today", label: "Today", value: today },
    { key: "tomorrow", label: "Tomorrow", value: tomorrow },
    { key: "next", label: "Next week", value: shiftDay(today, 7) },
    { key: "someday", label: "Someday", value: null },
  ];
  const weekdayName = day ? t(WEEKDAY_LONG[weekdayOf(day)]) : "";
  const repeatOptions: { value: RepeatChoice; label: string }[] = [
    { value: "NONE", label: t("No repeat") },
    { value: "DAILY", label: t("Daily") },
    { value: "WEEKLY", label: day ? t("Every {day}", { day: weekdayName }) : t("Weekly") },
    { value: "MONTHLY", label: day ? t("Monthly on the {day}", { day: dayOfMonthWord(Number(day.slice(8, 10)), fmt) }) : t("Monthly") },
  ];
  const doneSteps = steps.filter((step) => step.done).length;

  function pickDay(next: string | null) {
    setDay(next);
    setErrors((current) => ({ ...current, repeat: undefined }));
    // A weekly repeat on one day follows the date's weekday.
    if (next && repeat === "WEEKLY" && weekdays.length <= 1) setWeekdays([weekdayOf(next)]);
  }

  function addStep() {
    const words = stepDraft.trim();
    if (!words) return stepField.current?.focus();
    if (steps.length >= 20) return;
    setSteps((current) => [...current, { text: words, done: false }]);
    setStepDraft("");
    stepField.current?.focus();
  }

  async function submit(event?: React.FormEvent) {
    event?.preventDefault();
    if (locked) return;
    const words = text.trim();
    const next: typeof errors = {};
    if (!words) next.text = t("Write the task.");
    if (repeat !== "NONE" && !day) next.repeat = t("Pick a date first, so the task knows when to repeat.");
    if (repeat === "WEEKLY" && weekdays.length === 0) next.repeat = t("Pick at least one day.");
    if (next.text || next.repeat) {
      setErrors(next);
      if (next.text) textField.current?.focus();
      return;
    }
    // A step typed but not added yet is kept.
    const allSteps = stepDraft.trim() ? [...steps, { text: stepDraft.trim(), done: false }] : steps;
    const remind = dueTime ? remindBefore : null;
    const repeatInput = repeat === "NONE" ? null : repeat === "WEEKLY" ? { kind: repeat, weekdays: [...weekdays].sort((a, b) => a - b) } : { kind: repeat };
    const trimmedNote = note.trim();
    if (!editing) {
      setSaving(true);
      const done = await onAdd({ date: day, text: words, priority, dueTime, remindBefore: remind, categoryId, note: trimmedNote, steps: allSteps, ...(repeatInput && { repeat: repeatInput }) });
      setSaving(false);
      if (done) onClose();
      return;
    }
    const it = editing.item;
    const changes: TodoItemChanges = {};
    if (words !== it.text) changes.text = words;
    if (day !== editing.day) changes.date = day;
    if (dueTime !== it.dueTime) changes.dueTime = dueTime;
    if (remind !== (it.remindBefore ?? null)) changes.remindBefore = remind;
    if (priority !== it.priority) changes.priority = priority;
    if (categoryId !== (categoryOf(it, categories)?.id ?? null)) changes.categoryId = categoryId;
    if (trimmedNote !== it.note) changes.note = trimmedNote;
    if (!sameSteps(allSteps, it.steps)) changes.steps = allSteps;
    const was = it.repeat;
    if (!repeatInput) {
      if (was) changes.repeat = null;
    } else if (!was || was.kind !== repeatInput.kind || (repeatInput.kind === "WEEKLY" && !sameDays(was.weekdays, weekdays)) || (repeatInput.kind === "MONTHLY" && day !== editing.day)) {
      changes.repeat = repeatInput;
    }
    if (Object.keys(changes).length === 0) return onClose();
    setSaving(true);
    const saved = await onSave(editing, changes);
    setSaving(false);
    if (saved) onClose();
  }

  const optional = <span className="text-caption font-normal text-ink-faint">{t("(optional)")}</span>;

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      busy={locked}
      width={580}
      onSubmit={submit}
      className="rounded-[18px]"
      headClassName="items-center px-5.5 py-4 bg-linear-to-b from-emerald-soft to-surface"
      titleClassName="text-[18px] font-bold"
      subClassName="text-[12.5px] leading-[normal] text-ink-muted"
      closeClassName="size-8.5 rounded-sm"
      bodyClassName="gap-4 px-5.5 py-4.5 [scrollbar-width:thin]"
      footerClassName="justify-start gap-2.5 px-5.5 py-3.5"
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        const field = textField.current;
        field?.focus();
        field?.setSelectionRange(field.value.length, field.value.length);
      }}
      lead={
        <span aria-hidden="true" className="flex size-9.5 shrink-0 items-center justify-center rounded-[11px] bg-emerald text-on-action shadow-[0_6px_14px_-6px_var(--emerald)]">
          {editing ? <Pencil className="size-4.75" strokeWidth={2} /> : <Plus className="size-4.75" strokeWidth={2.25} />}
        </span>
      }
      title={editing ? t("Edit task") : t("New task")}
      sub={editing ? (item?.completed ? t("Done · you can still change it") : t("Change anything and save")) : t("Only the task is needed. The rest is optional.")}
      footer={
        <>
          {editing && (
            <button type="button" onClick={() => onDelete(editing)} disabled={locked} className="inline-flex h-10 items-center gap-2 rounded-sm border border-expense-line bg-surface px-4 text-body font-semibold text-expense-fill hover:brightness-97 disabled:opacity-60">
              <Trash2 className="size-3.75" strokeWidth={2} aria-hidden="true" />
              {t("Delete")}
            </button>
          )}
          <span className="flex-1" />
          <button type="button" onClick={onClose} disabled={locked} className="inline-flex h-10 items-center rounded-sm border border-input bg-surface px-4 text-body font-semibold text-ink hover:brightness-97 disabled:opacity-60">
            {t("Cancel")}
          </button>
          <button type="submit" disabled={locked} className="inline-flex h-10 min-w-32.5 items-center justify-center gap-2 rounded-sm bg-emerald px-4 text-body font-semibold text-on-action hover:bg-emerald-hover disabled:opacity-60">
            {locked && <Loader />}
            {editing ? t("Save changes") : t("Add task")}
          </button>
        </>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>
          {t("Task")} <span className="text-expense-fill">*</span>
        </span>
        <input
          ref={textField}
          value={text}
          maxLength={200}
          onChange={(event) => {
            setText(event.target.value);
            setErrors((current) => ({ ...current, text: undefined }));
          }}
          placeholder={t("What do you need to do?")}
          aria-invalid={!!errors.text || undefined}
          className={cn(FIELD, "h-11 text-[15.5px] font-medium", errors.text ? "border-expense-fill" : "border-input")}
        />
        {errors.text && (
          <span role="alert" className="text-[12.5px] text-expense-fill">
            {errors.text}
          </span>
        )}
      </label>

      <div className="grid gap-3.5 sm:grid-cols-[minmax(0,1fr)_150px]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className={LABEL}>{t("Date")}</span>
          <span className="relative block">
            <span className={cn(FIELD, "flex h-11 items-center gap-2.5 border-input")}>
              <CalendarDays className="size-4 shrink-0 text-emerald" strokeWidth={2} aria-hidden="true" />
              {pill && <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-caption font-bold", pill.className)}>{pill.text}</span>}
              <span className={cn("min-w-0 flex-1 truncate font-semibold", day ? "text-ink" : "text-ink-muted")}>{day ? dayText(day, fmt, "full") : t("No date yet")}</span>
              <ChevronDown className="size-3.5 shrink-0 text-ink-muted" strokeWidth={2} aria-hidden="true" />
            </span>
            <DateOverlay value={day ?? ""} label={t("Date")} onPick={pickDay} />
          </span>
          <span className="flex flex-wrap gap-1.5">
            {quick.map((option) => {
              const on = day === option.value;
              return (
                <button key={option.key} type="button" aria-pressed={on} onClick={() => pickDay(option.value)} className={cn("h-7 cursor-pointer rounded-full border px-2.5 text-[12.5px] font-semibold pointer-coarse:h-11", on ? "border-emerald bg-emerald-soft text-emerald" : "border-line bg-surface text-ink-soft hover:border-input")}>
                  {t(option.label)}
                </button>
              );
            })}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={LABEL}>
            {t("Time")} {optional}
          </span>
          <span className="relative inline-flex h-11 w-full items-center rounded-sm border border-input bg-surface focus-within:border-emerald">
            <Clock className="pointer-events-none absolute left-2.5 size-3.25 text-ink-muted" strokeWidth={2} aria-hidden="true" />
            <select value={dueTime ?? ""} onChange={(event) => setDueTime(event.target.value || null)} aria-label={t("Time")} className={cn("h-full w-full cursor-pointer appearance-none bg-transparent pr-6 pl-8 text-body font-semibold outline-none", dueTime ? "text-ink" : "text-ink-muted")}>
              <TimeOptions value={dueTime} none={t("Any time")} />
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 size-3 text-ink-muted" strokeWidth={2} aria-hidden="true" />
          </span>
          {dueTime && (
            <button type="button" onClick={() => setDueTime(null)} className="inline-flex h-6.5 cursor-pointer items-center gap-1 self-start text-[12.5px] font-semibold text-ink-muted hover:text-ink">
              <X className="size-3" strokeWidth={2.5} aria-hidden="true" />
              {t("Clear time")}
            </button>
          )}
        </div>
      </div>

      {/* A reminder needs a time to count back from. */}
      {dueTime && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="todo-remind" className={LABEL}>
            {t("Remind me")}
          </label>
          <RemindBeforeSelect id="todo-remind" value={remindBefore} onChange={setRemindBefore} className="w-full sm:w-60" />
          {remindBefore !== null && <ReminderPushHint />}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className={LABEL}>{t("Priority")}</span>
        <div role="radiogroup" aria-label={t("Priority")} className="grid grid-cols-3 gap-2">
          {PRIORITIES.map((option) => {
            const on = priority === option;
            return (
              <button key={option} type="button" role="radio" aria-checked={on} onClick={() => setPriority(option)} className={cn("flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[9px] border-[1.5px] text-[13.5px] font-semibold pointer-coarse:h-11", on ? PRIORITY_LOOK[option].on : "border-line bg-surface text-ink-2 hover:border-input")}>
                <span aria-hidden="true" className={cn("size-2.25 rounded-full", PRIORITY_LOOK[option].dot)} />
                {t(PRIORITY_LABEL[option])}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={LABEL}>{t("List")}</span>
        <div role="radiogroup" aria-label={t("List")} className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const on = categoryId === category.id;
            const tone = LIST_TONE[category.color];
            return (
              <button key={category.id} type="button" role="radio" aria-checked={on} onClick={() => setCategoryId(category.id)} className={cn("inline-flex h-8.5 cursor-pointer items-center gap-1.75 rounded-full border-[1.5px] px-3 text-small font-semibold pointer-coarse:h-11", on ? tone.on : "border-line bg-surface text-ink-2 hover:border-input")}>
                <span aria-hidden="true" className={cn("size-2.25 rounded-[3px]", tone.dot)} />
                {listName(category, t)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={LABEL}>{t("Repeat")}</span>
        <div role="radiogroup" aria-label={t("Repeat")} className="grid grid-cols-2 gap-1.5 rounded-[10px] bg-surface-sunken p-[3px] sm:grid-cols-[0.8fr_1fr_1.3fr_1.5fr]">
          {repeatOptions.map((option) => {
            const on = repeat === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setRepeat(option.value);
                  setErrors((current) => ({ ...current, repeat: undefined }));
                  if (option.value === "WEEKLY" && weekdays.length === 0 && day) setWeekdays([weekdayOf(day)]);
                }}
                className={cn("h-8.5 min-w-0 cursor-pointer truncate rounded-sm px-2 text-[12.5px] font-semibold whitespace-nowrap", on ? "bg-surface text-emerald shadow-[0_1px_2px_rgba(15,23,42,0.12)] dark:bg-surface-raised" : "text-ink-soft hover:text-ink")}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {/* More than one weekday stays possible, as the app always allowed. */}
        {repeat === "WEEKLY" && day && <WeekdayPicker value={weekdays} onChange={setWeekdays} labels="long" className="flex-wrap gap-1.5 *:h-7.5 *:rounded-sm *:text-[12.5px]" />}
        {errors.repeat ? (
          <span role="alert" className="text-[12.5px] text-expense-fill">
            {errors.repeat}
          </span>
        ) : (
          repeat !== "NONE" &&
          day && (
            <span className="flex items-center gap-1.5 text-[12.5px] text-emerald">
              <Info className="size-3.25 shrink-0" strokeWidth={2} aria-hidden="true" />
              {t("It shows up on its days by itself; ticking it off finishes only that day.")}
            </span>
          )
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between gap-2">
          <span className={LABEL}>
            {t("Steps")} {optional}
          </span>
          {steps.length > 0 && <span className="text-caption text-ink-muted">{t("{text} done", { text: ofText(doneSteps, steps.length, t, fmt) })}</span>}
        </span>
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-2.5 rounded-[9px] border border-divider bg-strip px-2 py-1.5">
            <TaskCheck size="sm" checked={step.done} label={step.done ? t("Mark step as not done") : t("Mark step as done")} onClick={() => setSteps((current) => current.map((each, i) => (i === index ? { ...each, done: !each.done } : each)))} />
            <span className={cn("min-w-0 flex-1 truncate text-[13.5px]", step.done ? "text-ink-faint line-through" : "text-ink")}>{step.text}</span>
            <button type="button" aria-label={t("Remove step")} title={t("Remove step")} onClick={() => setSteps((current) => current.filter((_, i) => i !== index))} className="flex size-6.5 shrink-0 cursor-pointer items-center justify-center rounded-[6px] text-ink-faint hover:bg-surface-sunken hover:text-ink">
              <X className="size-3.5" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        ))}
        {steps.length < 20 && (
          <span className="flex gap-2">
            <input
              ref={stepField}
              value={stepDraft}
              maxLength={120}
              onChange={(event) => setStepDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addStep();
                }
              }}
              placeholder={t("Add a step and press Enter")}
              aria-label={t("Add a step and press Enter")}
              className={cn(FIELD, "h-9.5 border-input text-[13.5px]")}
            />
            <button type="button" onClick={addStep} className="inline-flex h-9.5 shrink-0 cursor-pointer items-center rounded-sm border border-emerald-line bg-emerald-soft px-2.75 text-[12.5px] font-semibold text-emerald hover:brightness-97">
              + {t("Step")}
            </button>
          </span>
        )}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>
          {t("Note")} {optional}
        </span>
        <textarea value={note} rows={3} maxLength={1000} onChange={(event) => setNote(event.target.value)} placeholder={t("Anything useful: a number, an address or a reminder")} className={cn(FIELD, "resize-y border-input py-2.5 leading-[1.6]")} />
      </label>
    </PopupDialog>
  );
}
