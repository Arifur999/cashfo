"use client";

import { Check, ChevronDown, Repeat } from "lucide-react";
import Link from "next/link";
import { useState, type RefObject } from "react";
import { toast } from "sonner";
import { useTodayTasks } from "@/components/modules/Customer/Providers/TodayTasksProvider";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import Input from "@/components/smartly/form/Input";
import type { TodoItem, TodoList } from "@/lib/customer/api";
import { timeLabel } from "@/lib/customer/date";
import { actionError } from "@/lib/customer/habitDisplay";
import { movedLabel, PRIORITY_LABEL, repeatLabel } from "@/lib/customer/todoDisplay";
import { addTodoItemAction, createTodoListAction, updateTodoItemAction } from "@/lib/customer/todosActions";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PriorityDot, PRIORITY_TONE, TaskMeta } from "../Todos/TaskBits";

interface TodayTasksCardProps {
  today: string;
  // Today's list as the server rendered it, shown until the shell's own
  // copy has loaded.
  initial: TodoList | null;
  // The add box, so the page header's "Add task" can jump to it.
  inputRef: RefObject<HTMLInputElement | null>;
}

const SHOWN = 5;

// Today's to-do list, the same copy the top bar shows: what is left first,
// then what is done, and a box to add one more. Under each task: its
// priority, time and repeat. Phones get the board's taller rows, with the
// done ones folded under "N done". A task's words tick it too, not only
// its box.
export function TodayTasksCard({ today, initial, inputRef }: TodayTasksCardProps) {
  const { t, locale } = useLocale();
  const shell = useTodayTasks();
  const { loaded, setList } = shell;
  const list = loaded ? shell.list : initial;
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [showDone, setShowDone] = useState(false);

  const items = list?.items ?? [];
  const open = items.filter((item) => !item.completed);
  const done = items.filter((item) => item.completed);
  const shown = [...open, ...done].slice(0, SHOWN);
  const more = items.length - shown.length;

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value || adding) return;
    setAdding(true);
    try {
      let target = list;
      if (!target) {
        const created = await createTodoListAction(today);
        if (!created.success || !created.data) {
          toast.error(actionError(created.message, "Failed to add task", t, locale));
          return;
        }
        target = created.data;
        setList(target);
      }
      const result = await addTodoItemAction(target.id, { text: value });
      if (result.success && result.data) {
        setList(result.data);
        setText("");
      } else {
        toast.error(actionError(result.message, "Failed to add task", t, locale));
      }
    } finally {
      setAdding(false);
    }
  }

  function toggle(item: TodoItem) {
    if (!list || busy.has(item.id)) return;
    setBusy((prev) => new Set(prev).add(item.id));
    updateTodoItemAction(list.id, item.id, { completed: !item.completed })
      .then((result) => {
        if (result.success && result.data) setList(result.data);
        else toast.error(actionError(result.message, "Failed to update task", t, locale));
      })
      .finally(() =>
        setBusy((prev) => {
          const rest = new Set(prev);
          rest.delete(item.id);
          return rest;
        }),
      );
  }

  const checkbox = (item: TodoItem, className: string) => (
    <button
      type="button"
      role="checkbox"
      aria-checked={item.completed}
      aria-label={item.text}
      disabled={busy.has(item.id)}
      onClick={() => toggle(item)}
      className={cn("relative flex shrink-0 items-center justify-center transition-colors after:absolute after:-inset-3 disabled:opacity-50", item.completed ? "bg-emerald text-on-action" : "border-[1.5px] border-line-strong bg-surface hover:border-emerald", className)}
    >
      {item.completed && <Check className="size-3" strokeWidth={3.5} aria-hidden="true" />}
    </button>
  );

  // The board's line under a task: the priority's dot and word, its time,
  // how it repeats, and where it moved from.
  const meta = (item: TodoItem) => (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5 text-caption leading-[normal] text-ink-muted">
      <span className={cn("flex items-center gap-1.25 font-semibold", PRIORITY_TONE[item.priority].ink)}>
        <PriorityDot priority={item.priority} className="size-1.75" />
        {t(PRIORITY_LABEL[item.priority])}
      </span>
      {item.dueTime && <span className="tabular-nums">{timeLabel(item.dueTime, t, locale)}</span>}
      {item.repeat && (
        <span className="flex items-center gap-1">
          <Repeat className="size-3" aria-hidden="true" />
          {repeatLabel(item.repeat, t, locale)}
        </span>
      )}
      {item.movedFrom && <span className="font-semibold text-warning">{movedLabel(item.movedFrom, today, t, locale)}</span>}
    </span>
  );

  const phoneRow = (item: TodoItem) => (
    <li key={item.id} className="box-content border-t border-divider">
      <label className="flex min-h-13 cursor-pointer items-center gap-3">
        {checkbox(item, "size-5.5 rounded-[6px]")}
        <span className="flex min-w-0 flex-1 flex-col gap-0.75">
          <span className={cn("truncate text-body leading-[normal] font-medium", item.completed ? "text-ink-faint line-through" : "text-ink")}>{item.text}</span>
          <TaskMeta item={item} day={today} look="plain" />
        </span>
      </label>
    </li>
  );

  return (
    <Card padding="none" className="flex flex-col gap-1 rounded-md p-3.5 md:gap-1.5 md:px-5 md:pt-4.5 md:pb-4">
      <div className="flex items-center justify-between gap-3 px-0.5 pb-1 md:p-0">
        <div className="flex items-center gap-2">
          <h2 className="text-title leading-[normal] font-semibold text-ink">{t("Today's tasks")}</h2>
          {items.length > 0 && (
            <Chip tone="neutral" size="sm" className="max-md:hidden">
              {t("{count} left", { count: formatCount(open.length, locale) })}
            </Chip>
          )}
        </div>
        {items.length > 0 && (
          <span className="ml-auto text-small text-ink-muted md:hidden">{t("{count} left", { count: formatCount(open.length, locale) })}</span>
        )}
        {/* Phones open the list from the top bar's tasks button or the menu. */}
        <Link href="/habit-tracker/todos" className="flex shrink-0 items-center text-small font-semibold text-emerald hover:underline max-md:hidden">
          {t("Open list")}
        </Link>
      </div>
      {items.length > 0 ? (
        <>
          {/* Phones: what is left, then the done ones behind a fold. */}
          <div className="flex flex-col gap-1 md:hidden">
            <ul className="flex flex-col gap-1">{open.map(phoneRow)}</ul>
            {done.length > 0 && (
              <>
                <button type="button" aria-expanded={showDone} onClick={() => setShowDone((value) => !value)} className="flex h-11 items-center justify-between border-t border-divider px-0.5 text-small font-semibold text-ink-2">
                  {t("{count} done", { count: formatCount(done.length, locale) })}
                  <ChevronDown className={cn("size-4 transition-transform", showDone && "rotate-180")} aria-hidden="true" />
                </button>
                {showDone && <ul className="flex flex-col gap-1">{done.map(phoneRow)}</ul>}
              </>
            )}
          </div>
          <ul className="flex flex-col max-md:hidden">
            {shown.map((item) => (
              <li key={item.id} className="border-b border-divider">
                <label className="flex cursor-pointer items-start gap-2.5 py-2.25">
                  {checkbox(item, "mt-px size-4.5 rounded-[5px]")}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.75">
                    <span className={cn("truncate text-[13.5px] leading-[normal]", item.completed ? "text-ink-faint line-through" : "text-ink")}>{item.text}</span>
                    {meta(item)}
                  </span>
                </label>
              </li>
            ))}
            {more > 0 && (
              <li className="pt-2 text-caption text-ink-muted">{t("{count} more on the list", { count: formatCount(more, locale) })}</li>
            )}
          </ul>
        </>
      ) : (
        <span className="py-3 text-small text-ink-muted">{t("Nothing planned for today. Add the first task below.")}</span>
      )}
      <form onSubmit={add} className="mt-auto flex gap-2 pt-2">
        {/* The phone board's box is taller, with 16px text and a shorter hint. */}
        <Input value={text} onChange={(event) => setText(event.target.value)} maxLength={200} placeholder={t("Add a task…")} aria-label={t("New task for today")} size="md" frameClassName="flex-1 px-3 text-body-lg md:hidden" />
        <Input ref={inputRef} size="sm" value={text} onChange={(event) => setText(event.target.value)} maxLength={200} placeholder={t("Add a task for today…")} aria-label={t("New task for today")} frameClassName="flex-1 max-md:hidden" />
        {/* Phones: the board's 44px emerald Add; wider screens the soft one. */}
        <Button type="submit" variant="soft" size="sm" className="h-9.5 max-md:h-11 max-md:bg-emerald max-md:px-4 max-md:text-on-action" disabled={!text.trim() || adding}>
          {t("Add")}
        </Button>
      </form>
    </Card>
  );
}
