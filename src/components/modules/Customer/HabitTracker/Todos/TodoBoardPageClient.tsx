"use client";

import { ArrowRight, Check, ListChecks, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useTodayTasks } from "@/components/modules/Customer/Providers/TodayTasksProvider";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import Input from "@/components/smartly/form/Input";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import ProgressBar from "@/components/smartly/ProgressBar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { TodoItem, TodoList } from "@/lib/customer/api";
import { shiftDay } from "@/lib/customer/habitDisplay";
import { dayCount, dayLabel, doneItems, listFor, openItems, relativeName, upcoming, withList } from "@/lib/customer/todoDisplay";
import { addTodoItemAction, createTodoListAction, moveTodoItemToNextDayAction, removeTodoItemAction, updateTodoItemAction } from "@/lib/customer/todosActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { DayStrip } from "./DayStrip";
import { EditTaskDialog } from "./EditTaskDialog";

interface TodoBoardPageClientProps {
  lists: TodoList[];
  day: string;
  today: string;
}

// Habits › To-do list: a strip of days, the picked day's tasks with what is
// done and what is left, and what is coming up after it.
export function TodoBoardPageClient({ lists: serverLists, day, today }: TodoBoardPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const todayTasks = useTodayTasks();
  const addField = useRef<HTMLInputElement>(null);

  // The server's lists, with each action's answer laid over them until the
  // next refresh brings the server's own copy.
  const [lists, setLists] = useState(serverLists);
  const [prevServerLists, setPrevServerLists] = useState(serverLists);
  if (serverLists !== prevServerLists) {
    setPrevServerLists(serverLists);
    setLists(serverLists);
  }

  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<TodoItem | null>(null);
  const [removing, setRemoving] = useState<TodoItem | null>(null);

  const list = listFor(lists, day);
  const open = openItems(list);
  const done = doneItems(list);
  const count = dayCount(list);
  const name = relativeName(day, today);
  const heading = name ? `${t(name)} · ${dayLabel(day)}` : dayLabel(day);
  const canMoveOn = day >= today;
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
    if (!value || adding) return;
    setAdding(true);
    try {
      let target = list;
      if (!target) {
        const created = await createTodoListAction(day);
        if (!created.success || !created.data) {
          toast.error(created.message ?? t("Failed to add task"));
          return;
        }
        target = created.data;
      }
      const result = await addTodoItemAction(target.id, value);
      if (result.success && result.data) {
        absorb(result.data);
        setText("");
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to add task"));
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
      else toast.error(result.message ?? t("Failed to update task"));
    });
  }

  function rename(item: TodoItem, value: string) {
    if (!list) return;
    withBusy(item.id, async () => {
      const result = await updateTodoItemAction(list.id, item.id, { text: value });
      if (result.success && result.data) {
        absorb(result.data);
        setEditing(null);
      } else {
        toast.error(result.message ?? t("Failed to update task"));
      }
    });
  }

  async function moveOn(item: TodoItem, quiet = false): Promise<boolean> {
    if (!list) return false;
    const result = await moveTodoItemToNextDayAction(list.id, item.id);
    if (result.success && result.data) {
      absorb(result.data);
      if (!quiet) toast.success(t("Moved to tomorrow"));
      return true;
    }
    toast.error(result.message ?? t("Failed to move task"));
    return false;
  }

  function moveOne(item: TodoItem) {
    withBusy(item.id, async () => {
      await moveOn(item);
      // The day it went to isn't in the answer; the refresh brings it.
      router.refresh();
    });
  }

  function moveAll() {
    withBusy("all", async () => {
      let moved = 0;
      for (const item of open) if (await moveOn(item, true)) moved++;
      if (moved > 0) toast.success(`${moved} ${t(moved === 1 ? "task moved to tomorrow" : "tasks moved to tomorrow")}`);
      router.refresh();
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
        toast.error(result.message ?? t("Failed to remove task"));
      }
    });
  }

  const groups: { key: string; title: string; items: TodoItem[] }[] = [
    { key: "open", title: t("To do"), items: open },
    { key: "done", title: t("Done"), items: done },
  ];

  return (
    <PageFrame className="gap-4">
      <PageHeader
        eyebrow={t("Habits")}
        tone="habits"
        title={t("To-do list")}
        description={t("Plan the day. Anything left unfinished can move to tomorrow.")}
        actions={
          <Button onClick={() => addField.current?.focus()}>
            <Plus strokeWidth={2.25} />
            {t("New task")}
          </Button>
        }
      />

      <DayStrip lists={lists} day={day} today={today} />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 pt-4 pb-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-h3 font-semibold text-ink">{heading}</h2>
              <span className="text-small text-ink-muted">{t("What's left first, then what's done.")}</span>
            </div>
            {count.total > 0 && (
              <span className="flex items-center gap-3 text-small text-ink-2">
                <b className="font-semibold text-ink">
                  {count.done} {t("of")} {count.total} {t("done")}
                </b>
                <ProgressBar value={(count.done / count.total) * 100} label={t("Tasks done")} className="w-30" />
              </span>
            )}
          </div>

          <form onSubmit={add} className="flex gap-2 px-5 pb-4">
            <Input ref={addField} size="md" value={text} onChange={(event) => setText(event.target.value)} maxLength={200} placeholder={name === "Today" ? t("Add a task for today…") : t("Add a task for this day…")} aria-label={t("New task")} frameClassName="h-10 flex-1" />
            <Button type="submit" variant="action" disabled={!text.trim() || adding}>
              {t("Add")}
            </Button>
          </form>

          {count.total === 0 ? (
            <div className="flex flex-col items-center gap-2 border-t border-surface-sunken px-8 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-pillar-habits-soft text-pillar-habits">
                <ListChecks className="size-5.5" aria-hidden="true" />
              </span>
              <span className="text-title font-semibold text-ink">{name === "Today" ? t("Nothing planned for today") : t("Nothing planned for this day")}</span>
              <span className="text-small text-ink-muted">{t("Type a task above and press Enter.")}</span>
            </div>
          ) : (
            groups.map(
              (group) =>
                group.items.length > 0 && (
                  <div key={group.key} className="flex flex-col">
                    <div className="flex items-center gap-2 border-y border-line bg-cream px-5 py-2 text-caption font-semibold text-ink-muted">
                      {group.title}
                      <span className="rounded-full bg-surface-sunken px-2 text-ink-2 tabular-nums">{group.items.length}</span>
                    </div>
                    {group.items.map((item) => (
                      <div key={item.id} className="flex min-h-15 items-center gap-3 border-b border-surface-sunken px-5 py-2 last:border-b-0">
                        <button type="button" role="checkbox" aria-checked={item.completed} aria-label={item.text} disabled={busy.has(item.id)} onClick={() => toggle(item)} className={cn("flex size-5 shrink-0 items-center justify-center rounded-sm transition-colors disabled:opacity-50", item.completed ? "bg-emerald text-white" : "border-[1.5px] border-line-strong bg-surface hover:border-emerald")}>
                          {item.completed && <Check className="size-3.5" strokeWidth={3.5} aria-hidden="true" />}
                        </button>
                        <span className={cn("min-w-0 flex-1 truncate text-body font-medium", item.completed ? "text-ink-muted line-through" : "text-ink")}>{item.text}</span>
                        {!item.completed && canMoveOn && (
                          <Button type="button" variant="outline" size="sm" onClick={() => moveOne(item)} disabled={busy.has(item.id)} title={t("Move to tomorrow")} className="h-8 border-line px-3 text-ink-2">
                            <ArrowRight className="size-3.5" strokeWidth={2.5} />
                            {t("Tomorrow")}
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger aria-label={`${t("More for")} ${item.text}`} className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-cream data-open:bg-cream">
                            <MoreVertical className="size-4" aria-hidden="true" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
                            <DropdownMenuItem onSelect={() => setEditing(item)} className="rounded-md px-3 py-2 text-body text-ink focus:bg-cream">
                              <Pencil className="size-4" aria-hidden="true" />
                              {t("Edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setRemoving(item)} className="rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense">
                              <Trash2 className="size-4" aria-hidden="true" />
                              {t("Delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                ),
            )
          )}

          {count.total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-cream px-5 py-3">
              <span className="text-small text-ink-2">{open.length === 0 ? t("Everything is done for this day.") : `${open.length} ${t(open.length === 1 ? "task is still open." : "tasks are still open.")}`}</span>
              {open.length > 0 && canMoveOn && (
                <Button variant="secondary" size="sm" onClick={moveAll} disabled={busy.has("all")}>
                  <ArrowRight className="size-4" strokeWidth={2.5} />
                  {t(open.length === 1 ? "Move it to tomorrow" : open.length === 2 ? "Move both to tomorrow" : "Move all to tomorrow")}
                </Button>
              )}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <UpcomingCard title={`${tomorrowName ? t(tomorrowName) : dayLabel(shiftDay(day, 1), "EEEE")} · ${dayLabel(shiftDay(day, 1), "EEE d MMM")}`} rows={openItems(next.tomorrow).map((item) => ({ key: item.id, text: item.text }))} empty={t("Nothing planned yet.")} />
          <UpcomingCard title={t("Later this week")} rows={next.later.map(({ day: when, item }) => ({ key: item.id, text: item.text, sub: dayLabel(when, "EEE d MMM") }))} empty={t("Nothing planned yet.")} />
        </div>
      </div>

      <EditTaskDialog item={editing} dayLabel={heading} isPending={editing !== null && busy.has(editing.id)} onClose={() => setEditing(null)} onSave={rename} onDelete={setRemoving} />
      <ConfirmDialog open={removing !== null} onClose={() => setRemoving(null)} onConfirm={remove} isPending={removing !== null && busy.has(removing.id)} danger title={t("Delete task")} description={removing ? `${t("Delete")} "${removing.text}"? ${t("This cannot be undone.")}` : ""} confirmLabel={t("Delete")} />
    </PageFrame>
  );
}

interface UpcomingRow {
  key: string;
  text: string;
  sub?: string;
}

function UpcomingCard({ title, rows, empty }: { title: string; rows: UpcomingRow[]; empty: string }) {
  const { t } = useLocale();
  return (
    <Card padding="none" className="flex flex-col gap-2 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="truncate text-title font-semibold text-ink">{title}</h2>
        <span className="shrink-0 text-caption text-ink-muted">
          {rows.length} {t(rows.length === 1 ? "task" : "tasks")}
        </span>
      </div>
      {rows.length === 0 ? (
        <span className="py-2 text-small text-ink-muted">{empty}</span>
      ) : (
        rows.map((row) => (
          <div key={row.key} className="flex items-start gap-3 py-2">
            <span className="mt-2 size-2 shrink-0 rounded-full bg-pillar-habits" aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-body font-medium text-ink">{row.text}</span>
              {row.sub && <span className="text-caption text-ink-muted">{row.sub}</span>}
            </span>
          </div>
        ))
      )}
    </Card>
  );
}
