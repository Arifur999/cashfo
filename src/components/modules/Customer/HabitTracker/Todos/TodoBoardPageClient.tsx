"use client";

import { ArrowLeft, ArrowRightToLine, Check, ListChecks, MoreVertical, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useTodayTasks } from "@/components/modules/Customer/Providers/TodayTasksProvider";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import Input from "@/components/smartly/form/Input";
import { ListCard, ListCell, ListEmpty, ListFooter, ListGroupRow, ListRow, ListRowActions } from "@/components/smartly/list";
import LoadMore from "@/components/smartly/LoadMore";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import ProgressBar from "@/components/smartly/ProgressBar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { TodoItem, TodoList, TodoPriority, TodoRepeat } from "@/lib/customer/api";
import { timeLabel } from "@/lib/customer/date";
import { actionError, shiftDay } from "@/lib/customer/habitDisplay";
import { byPriority, dayCount, dayLabel, doneItems, doneOfText, listFor, openItems, PRIORITY_LABEL, relativeName, repeatLabel, upcoming, withList } from "@/lib/customer/todoDisplay";
import { addTodoItemAction, createTodoListAction, moveTodoItemToNextDayAction, removeTodoItemAction, type TodoItemChanges, updateTodoItemAction } from "@/lib/customer/todosActions";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { dayHref, DayStrip } from "./DayStrip";
import { PRIORITY_TONE, PriorityMenu, TaskMeta, TimeButton } from "./TaskBits";
import { TaskDrawer } from "./TaskDrawer";

interface TodoBoardPageClientProps {
  lists: TodoList[];
  repeats: TodoRepeat[];
  day: string;
  today: string;
}

const LIST_ID = "todo-day";
// The done tasks of a busy day grow 50 at a time.
const STEP = 50;

// Habits › To-do list: a strip of days, the picked day's tasks with what is
// done and what is left, and what is coming up after it. An open task on a
// past day can be brought to today; on today or later it can move on.
export function TodoBoardPageClient({ lists: serverLists, repeats, day, today }: TodoBoardPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const todayTasks = useTodayTasks();
  const addField = useRef<HTMLInputElement>(null);
  const count = (n: number) => formatCount(n, locale);

  // The server's lists, with each action's answer laid over them until the
  // next refresh brings the server's own copy.
  const [lists, setLists] = useState(serverLists);
  const [prevServerLists, setPrevServerLists] = useState(serverLists);
  if (serverLists !== prevServerLists) {
    setPrevServerLists(serverLists);
    setLists(serverLists);
  }

  const [text, setText] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("MEDIUM");
  const [time, setTime] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<TodoItem | null>(null);
  const [removing, setRemoving] = useState<TodoItem | null>(null);
  const [shownDone, setShownDone] = useState(STEP);

  const list = listFor(lists, day);
  const open = byPriority(openItems(list));
  const done = byPriority(doneItems(list));
  const total = dayCount(list);
  const name = relativeName(day, today);
  const heading = name ? `${t(name)} · ${dayLabel(day, locale)}` : dayLabel(day, locale);
  // An open task on a past day comes to today; on today or later it moves on.
  const past = day < today;
  // A past copy of a repeating task stays put when its rule already has a
  // copy on today: moving it would leave the task there twice.
  const todayRules = new Set((past ? (listFor(lists, today)?.items ?? []) : []).flatMap((item) => (item.repeat ? [item.repeat.id] : [])));
  const canMove = (item: TodoItem) => !item.completed && !(past && item.repeat && todayRules.has(item.repeat.id));
  const movable = open.filter(canMove);
  const next = upcoming(lists, day);
  const tomorrowName = relativeName(shiftDay(day, 1), today);

  function absorb(updated: TodoList) {
    setLists((current) => withList(current, updated));
    if (updated.date === today) todayTasks.setList(updated);
  }

  function withBusy(id: string, work: () => Promise<void>) {
    if (busy.has(id)) return;
    setBusy((prev) => new Set(prev).add(id));
    void work().finally(() =>
      setBusy((prev) => {
        const rest = new Set(prev);
        rest.delete(id);
        return rest;
      }),
    );
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (adding) return;
    // Add stays live, as the board draws it; with nothing typed it sends
    // you back to the field.
    if (!value) {
      addField.current?.focus();
      return;
    }
    setAdding(true);
    try {
      let target = list;
      if (!target) {
        const created = await createTodoListAction(day);
        if (!created.success || !created.data) {
          toast.error(actionError(created.message, "Failed to add task", t, locale));
          return;
        }
        target = created.data;
      }
      const result = await addTodoItemAction(target.id, { text: value, priority, dueTime: time });
      if (result.success && result.data) {
        absorb(result.data);
        setText("");
        setTime(null);
        router.refresh();
      } else {
        toast.error(actionError(result.message, "Failed to add task", t, locale));
      }
    } finally {
      setAdding(false);
    }
  }

  function toggle(item: TodoItem) {
    if (!list) return;
    withBusy(item.id, async () => {
      const result = await updateTodoItemAction(list.id, item.id, { completed: !item.completed });
      if (result.success && result.data) absorb(result.data);
      else toast.error(actionError(result.message, "Failed to update task", t, locale));
    });
  }

  function save(item: TodoItem, changes: TodoItemChanges) {
    if (!list) return;
    withBusy(item.id, async () => {
      const result = await updateTodoItemAction(list.id, item.id, changes);
      if (result.success && result.data) {
        absorb(result.data);
        setEditing(null);
        toast.success(t("Task saved"));
        // A move or a new repeat touches other days; the refresh brings them.
        if (changes.date || changes.repeat !== undefined) router.refresh();
      } else {
        toast.error(actionError(result.message, "Failed to update task", t, locale));
      }
    });
  }

  // "High · 10:00 am · every Thursday" under an upcoming task, with its day
  // first when it is later in the week.
  const upcomingSub = (item: TodoItem, when?: string) =>
    [when && dayLabel(when, locale, "short"), t(PRIORITY_LABEL[item.priority]), item.dueTime && timeLabel(item.dueTime, t, locale), item.repeat && repeatLabel(item.repeat, t, locale, true)].filter(Boolean).join(" · ");

  async function moveOn(item: TodoItem, quiet = false): Promise<boolean> {
    if (!list) return false;
    const result = await moveTodoItemToNextDayAction(list.id, item.id);
    if (result.success && result.data) {
      absorb(result.data);
      if (!quiet) toast.success(t("Moved to tomorrow"));
      return true;
    }
    toast.error(actionError(result.message, "Failed to move task", t, locale));
    return false;
  }

  // An open task left on a past day comes to today (its list moves it).
  async function bringToToday(item: TodoItem, quiet = false): Promise<boolean> {
    if (!list) return false;
    const result = await updateTodoItemAction(list.id, item.id, { date: today });
    if (result.success && result.data) {
      absorb(result.data);
      if (!quiet) toast.success(t("Moved to today"));
      return true;
    }
    toast.error(actionError(result.message, "Failed to move task", t, locale));
    return false;
  }

  function moveOne(item: TodoItem) {
    withBusy(item.id, async () => {
      await (past ? bringToToday(item) : moveOn(item));
      // The day it went to isn't in the answer; the refresh brings it (and
      // the top bar's copy of today, when that is where it went).
      router.refresh();
      if (past) void todayTasks.reload();
    });
  }

  function moveAll() {
    withBusy("all", async () => {
      let moved = 0;
      for (const item of movable) if (await (past ? bringToToday(item, true) : moveOn(item, true))) moved++;
      if (moved > 0) toast.success(t(past ? (moved === 1 ? "{count} task moved to today" : "{count} tasks moved to today") : moved === 1 ? "{count} task moved to tomorrow" : "{count} tasks moved to tomorrow", { count: count(moved) }));
      router.refresh();
      if (past) void todayTasks.reload();
    });
  }

  function remove() {
    if (!list || !removing) return;
    const item = removing;
    withBusy(item.id, async () => {
      const result = await removeTodoItemAction(list.id, item.id);
      if (result.success && result.data) {
        absorb(result.data);
        setRemoving(null);
        setEditing(null);
      } else {
        toast.error(actionError(result.message, "Failed to remove task", t, locale));
      }
    });
  }

  const moveLabel = past ? t("Move to today") : t("Move to tomorrow");

  const row = (item: TodoItem) => (
    <ListRow key={item.id} muted={busy.has(item.id)} className="min-h-15 gap-x-3 py-2 md:px-5 md:py-2">
      <ListCell>
        {/* The words tick the task too, not only its box. */}
        <label className="flex min-w-0 cursor-pointer items-center gap-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={item.completed}
            aria-label={item.text}
            disabled={busy.has(item.id)}
            onClick={() => toggle(item)}
            className={cn("relative flex size-5 shrink-0 items-center justify-center rounded-[6px] transition-colors after:absolute after:-inset-3 disabled:opacity-50", item.completed ? "bg-emerald text-on-action" : "border-[1.5px] border-line-strong bg-surface hover:border-emerald")}
          >
            {item.completed && <Check className="size-3.25" strokeWidth={3.5} aria-hidden="true" />}
          </button>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className={cn("truncate text-[14.5px] leading-[normal] font-medium", item.completed ? "text-ink-faint line-through" : "text-ink")}>{item.text}</span>
            <TaskMeta item={item} day={day} />
          </span>
        </label>
      </ListCell>
      <ListRowActions>
        {canMove(item) && (
          <button type="button" onClick={() => moveOne(item)} disabled={busy.has(item.id)} title={moveLabel} aria-label={`${moveLabel}: ${item.text}`} className="flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-line bg-surface px-2.5 text-[12.5px] font-semibold whitespace-nowrap text-ink-soft transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-50 pointer-coarse:h-11">
            {past ? <ArrowLeft className="size-3.5" strokeWidth={2.25} aria-hidden="true" /> : <ArrowRightToLine className="size-3.5" strokeWidth={2.25} aria-hidden="true" />}
            <span className="hidden sm:inline">{past ? t("Today") : t("Tomorrow")}</span>
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={t("More for {name}", { name: item.text })} className="flex size-8 shrink-0 items-center justify-center rounded-sm text-ink-faint hover:bg-surface-sunken hover:text-ink-muted data-open:bg-surface-sunken pointer-coarse:size-11">
            <MoreVertical className="size-4" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
            <DropdownMenuItem onSelect={() => setEditing(item)} className="rounded-md px-3 py-2 text-body text-ink focus:bg-surface-sunken pointer-coarse:min-h-11">
              <Pencil className="size-4" aria-hidden="true" />
              {t("Edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setRemoving(item)} className="rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense pointer-coarse:min-h-11">
              <Trash2 className="size-4" aria-hidden="true" />
              {t("Delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ListRowActions>
    </ListRow>
  );

  // Each band draws a line above it, between it and the add row or the rows
  // of the group before. The chip counts the whole group, though a long one
  // shows a page at a time.
  const group = (key: string, title: string, items: TodoItem[], shown = items.length, footer?: React.ReactNode) =>
    items.length > 0 && (
      <div key={key} role="rowgroup">
        {/* The count sits beside its group's name, as a chip. */}
        <ListGroupRow
          label={
            <span className="inline-flex items-center gap-2">
              {title}
              <span className="rounded-full bg-line px-1.75 tracking-normal text-ink-soft tabular-nums">{count(items.length)}</span>
            </span>
          }
          className="border-t border-line bg-strip text-ink-muted uppercase tracking-[0.04em] md:px-5 *:[[role=cell]]:h-8"
        />
        {items.slice(0, shown).map(row)}
        {footer}
      </div>
    );

  return (
    <PageFrame className="gap-4.5 md:pt-7">
      <PageHeader
        title={t("To Do List")}
        description={t("Plan the day. Anything left unfinished can move to tomorrow.")}
        actions={
          <Button onClick={() => addField.current?.focus()} className="rounded-sm">
            <Plus strokeWidth={2.25} />
            {t("New task")}
          </Button>
        }
      />

      <DayStrip lists={lists} day={day} today={today} />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <ListCard
          id={LIST_ID}
          label={heading}
          className="rounded-md"
          header={
            <div className={cn("flex flex-col gap-3 px-4 pt-4 pb-3.5 md:px-5", total.total === 0 && "border-b border-line")}>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h2 className="text-[17px] leading-[normal] font-semibold text-ink">{heading}</h2>
                  <span className="text-[12.5px] leading-[normal] text-ink-muted">{t("High priority first, then by time")}</span>
                </div>
                {total.total > 0 && (
                  <span className="flex items-center gap-2.5 text-small text-ink-soft">
                    <b className="font-semibold text-ink">{doneOfText(total.done, total.total, t, locale)}</b>
                    <ProgressBar value={(total.done / total.total) * 100} label={t("Tasks done")} className="w-30" />
                  </span>
                )}
              </div>
              {/* On a phone the words get the whole row; the rest goes under them. */}
              <form onSubmit={add} className="flex flex-wrap gap-2 sm:flex-nowrap">
                <Input ref={addField} size="md" value={text} onChange={(event) => setText(event.target.value)} maxLength={200} placeholder={name === "Today" ? t("Add a task for today…") : t("Add a task for this day…")} aria-label={t("New task")} frameClassName="h-10 basis-full rounded-sm border-input sm:basis-auto sm:flex-1 pointer-coarse:h-11" />
                <PriorityMenu value={priority} onChange={setPriority} />
                <TimeButton value={time} onChange={setTime} />
                <Button type="submit" variant="action" disabled={adding} className="rounded-sm shadow-none max-sm:flex-1 pointer-coarse:h-11">
                  {t("Add")}
                </Button>
              </form>
            </div>
          }
          footer={
            total.total > 0 && (
              <ListFooter className="border-line bg-strip md:px-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-small text-ink-soft">
                    {open.length === 0
                      ? t("Everything is done for this day.")
                      : name === "Today"
                        ? t(open.length === 1 ? "{count} task is still open today." : "{count} tasks are still open today.", { count: count(open.length) })
                        : t(open.length === 1 ? "{count} task is still open." : "{count} tasks are still open.", { count: count(open.length) })}
                  </span>
                  {movable.length > 0 && (
                    <Button variant="secondary" size="sm" onClick={moveAll} disabled={busy.has("all")} className="gap-1.5 rounded-sm pointer-coarse:h-11">
                      {past ? <ArrowLeft className="size-3.5 text-ink-soft" strokeWidth={2.25} /> : <ArrowRightToLine className="size-3.5 text-ink-soft" strokeWidth={2.25} />}
                      {/* "All" only when it is all: a repeating task already on today stays. */}
                      {past && movable.length < open.length ? t("Move {count} to today", { count: count(movable.length) }) : past ? t(movable.length === 1 ? "Move it to today" : movable.length === 2 ? "Move both to today" : "Move all to today") : t(movable.length === 1 ? "Move it to tomorrow" : movable.length === 2 ? "Move both to tomorrow" : "Move all to tomorrow")}
                    </Button>
                  )}
                </div>
              </ListFooter>
            )
          }
        >
          {total.total === 0 ? (
            <ListEmpty icon={<ListChecks />} tone="money" title={name === "Today" ? t("Nothing planned for today") : t("Nothing planned for this day")} description={t("Type a task above and press Enter.")} />
          ) : (
            <>
              {group("open", t("To do"), open)}
              {group(
                "done",
                t("Done"),
                done,
                shownDone,
                done.length > STEP && (
                  <div role="row">
                    <div role="cell" className="border-t border-divider px-4 py-3 md:px-6">
                      <LoadMore shown={Math.min(shownDone, done.length)} total={done.length} step={STEP} onMore={() => setShownDone((value) => value + STEP)} onLess={shownDone >= done.length ? () => setShownDone(STEP) : undefined} focusTargetId={LIST_ID} />
                    </div>
                  </div>
                ),
              )}
            </>
          )}
        </ListCard>

        <div className="flex flex-col gap-4">
          <UpcomingCard
            title={[tomorrowName ? t(tomorrowName) : dayLabel(shiftDay(day, 1), locale, "weekday"), dayLabel(shiftDay(day, 1), locale, "short")].join(" · ")}
            rows={byPriority(openItems(next.tomorrow)).map((item) => ({ key: item.id, text: item.text, sub: upcomingSub(item), priority: item.priority, day: shiftDay(day, 1) }))}
            empty={t("Nothing planned yet.")}
          />
          <UpcomingCard title={t("Later this week")} rows={next.later.map(({ day: when, item }) => ({ key: item.id, text: item.text, sub: upcomingSub(item, when), priority: item.priority, day: when }))} empty={t("Nothing planned yet.")} />
          {repeats.length > 0 && (
            <Card padding="none" className="flex flex-col gap-2 rounded-md px-4.5 py-3.5">
              <h2 className="flex items-center gap-2 text-[15px] leading-[normal] font-semibold text-ink">
                <Repeat className="size-3.75 text-emerald" aria-hidden="true" />
                {t("Repeating tasks")}
              </h2>
              {repeats.map((rule) => (
                <div key={rule.id} className="flex justify-between gap-2.5 text-small">
                  <span className="min-w-0 truncate font-medium text-ink">{rule.text}</span>
                  <span className="whitespace-nowrap text-ink-muted">{repeatLabel(rule, t, locale)}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      <TaskDrawer item={editing} day={day} today={today} isPending={editing !== null && busy.has(editing.id)} onClose={() => setEditing(null)} onSave={save} onDelete={setRemoving} />
      <ConfirmDialog open={removing !== null} onClose={() => setRemoving(null)} onConfirm={remove} isPending={removing !== null && busy.has(removing.id)} danger title={t("Delete task")} description={removing ? t("Delete \"{name}\"? This cannot be undone.", { name: removing.text }) : ""} confirmLabel={t("Delete")} />
    </PageFrame>
  );
}

interface UpcomingRow {
  key: string;
  text: string;
  sub?: string;
  priority: TodoPriority;
  // The day it is on: the row opens it.
  day: string;
}

function UpcomingCard({ title, rows, empty }: { title: string; rows: UpcomingRow[]; empty: string }) {
  const { t, locale } = useLocale();
  return (
    <Card padding="none" className="flex flex-col gap-2 rounded-md px-4.5 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="truncate text-[15px] leading-[normal] font-semibold text-ink">{title}</h2>
        <span className="shrink-0 text-caption text-ink-muted">{t(rows.length === 1 ? "{count} task" : "{count} tasks", { count: formatCount(rows.length, locale) })}</span>
      </div>
      {rows.length === 0 ? (
        <span className="py-1.5 text-small text-ink-muted">{empty}</span>
      ) : (
        // Each task opens its day.
        rows.map((row) => (
          <Link key={row.key} href={dayHref(row.day)} className="-mx-2 flex items-start gap-2.5 rounded-sm px-2 py-1.5 transition-colors hover:bg-hover">
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", PRIORITY_TONE[row.priority].dot)} aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[13.5px] leading-[normal] font-medium text-ink">{row.text}</span>
              {row.sub && <span className="text-caption text-ink-muted">{row.sub}</span>}
            </span>
          </Link>
        ))
      )}
    </Card>
  );
}
