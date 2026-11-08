"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTodayTasks } from "@/components/modules/Customer/Providers/TodayTasksProvider";
import type { TodoCategory, TodoColor, TodoItem, TodoList } from "@/lib/customer/api";
import { actionError, shiftDay } from "@/lib/customer/habitDisplay";
import { boardTasks, type BoardTask, dayWord, nextOnRule } from "@/lib/customer/todoBoard";
import { withList } from "@/lib/customer/todoDisplay";
import {
  createTaskAction,
  createTodoCategoryAction,
  deleteTodoCategoryAction,
  moveTodoItemsAction,
  type NewTask,
  removeTodoItemAction,
  type TodoItemChanges,
  updateTodoItemAction,
} from "@/lib/customer/todosActions";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// A list made on the spot while a move is on its way, until the server's
// own copy arrives with the refresh: its tasks wait (busy) till then.
const PENDING = "pending:";
export const isPendingList = (listId: string) => listId.startsWith(PENDING);

// Everything a task is, to put it back after a delete (the board's Undo).
function restoreOf(task: BoardTask): NewTask {
  const { item } = task;
  return {
    date: task.day,
    text: item.text,
    priority: item.priority,
    dueTime: item.dueTime,
    remindBefore: item.remindBefore ?? null,
    categoryId: item.categoryId,
    note: item.note,
    steps: item.steps,
    completed: item.completed,
    ...(item.completed && item.completedAt && { completedAt: item.completedAt }),
    movedFrom: item.movedFrom,
    moveCount: item.moveCount,
    ...(item.repeat && task.day && { repeatId: item.repeat.id }),
  };
}

// The task the server just added: the one in the new copy of its list that
// wasn't there before.
const addedItem = (before: TodoList | undefined, after: TodoList): TodoItem | undefined => after.items.find((item) => !before?.items.some((old) => old.id === item.id));

// The To Do board's records and every change to them. Each change goes to
// the server; its answer (the list it touched) replaces that list here, and
// a move -- which touches a list the answer doesn't carry -- moves the task
// on screen at once and refreshes the page for the rest. Each change says
// what it did in a toast with Undo.
export function useTodoBoard({ lists: serverLists, categories: serverCategories, today }: { lists: TodoList[]; categories: TodoCategory[]; today: string }) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const todayTasks = useTodayTasks();

  const [lists, setLists] = useState(serverLists);
  const [prevLists, setPrevLists] = useState(serverLists);
  if (serverLists !== prevLists) {
    setPrevLists(serverLists);
    setLists(serverLists);
  }
  const [categories, setCategories] = useState(serverCategories);
  const [prevCategories, setPrevCategories] = useState(serverCategories);
  if (serverCategories !== prevCategories) {
    setPrevCategories(serverCategories);
    setCategories(serverCategories);
  }
  // Tasks with a change on its way (dimmed, not clickable).
  const [busy, setBusy] = useState<Set<string>>(new Set());
  // The latest lists, for an Undo pressed after later changes.
  const latest = useRef(lists);
  useEffect(() => {
    latest.current = lists;
  }, [lists]);

  // The shell's copy of today's list (the top bar's badge, the sidebar's
  // count, the Today panel) follows the board.
  const todayList = lists.find((list) => list.date === today) ?? null;
  const { setList: setTodayList } = todayTasks;
  useEffect(() => {
    if (!todayList || !isPendingList(todayList.id)) setTodayList(todayList);
  }, [todayList, setTodayList]);

  const refresh = () => startTransition(() => router.refresh());
  const fail = (message: string | undefined, fallback: string) => toast.error(actionError(message, fallback, t, fmt));
  const take = (list: TodoList) => setLists((current) => withList(current, list));

  const mark = (ids: string[], on: boolean) =>
    setBusy((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  // Where a task is now (it may have moved since the toast came up).
  const locate = (itemId: string): BoardTask | undefined => boardTasks(latest.current).find((task) => task.item.id === itemId);

  const undoable = (message: string, undo: () => Promise<void> | void) => toast.success(message, { action: { label: t("Undo"), onClick: () => void undo() } });

  // Takes the tasks off their lists and onto `to`'s at once (a list made on
  // the spot when the day has none yet).
  function moveLocally(tasks: BoardTask[], to: string | null) {
    const ids = new Set(tasks.map((task) => task.item.id));
    setLists((current) => {
      const moving = current.flatMap((list) => list.items.filter((item) => ids.has(item.id)));
      const stripped = current.map((list) => (list.items.some((item) => ids.has(item.id)) ? { ...list, items: list.items.filter((item) => !ids.has(item.id)) } : list));
      const target = stripped.find((list) => list.date === to);
      if (target) return stripped.map((list) => (list === target ? { ...list, items: [...list.items, ...moving] } : list));
      return [...stripped, { id: `${PENDING}${to ?? "someday"}`, date: to, items: moving }];
    });
  }

  async function add(task: NewTask, quiet = false): Promise<boolean> {
    const result = await createTaskAction(task);
    if (!result.success || !result.data) {
      fail(result.message, "Failed to add task");
      return false;
    }
    const list = result.data;
    const before = latest.current.find((each) => each.id === list.id);
    const added = addedItem(before, list);
    take(list);
    // A repeat touches the days ahead too.
    if (task.repeat) refresh();
    if (!quiet) {
      const message = `${t("Task added")} · ${dayWord(task.date, today, t, fmt)}`;
      if (added) undoable(message, () => void remove({ item: added, listId: list.id, day: list.date }, true));
      else toast.success(message);
    }
    return true;
  }

  async function toggle(task: BoardTask) {
    const { item } = task;
    if (busy.has(item.id) || isPendingList(task.listId)) return;
    const completed = !item.completed;
    // The tick shows at once; the server's answer follows.
    setLists((current) =>
      current.map((list) => (list.id === task.listId ? { ...list, items: list.items.map((each) => (each.id === item.id ? { ...each, completed, completedAt: completed ? new Date().toISOString() : null } : each)) } : list)),
    );
    mark([item.id], true);
    const result = await updateTodoItemAction(task.listId, item.id, { completed });
    mark([item.id], false);
    if (!result.success || !result.data) {
      fail(result.message, "Failed to update task");
      refresh();
      return;
    }
    take(result.data);
    const back = () => {
      const now = locate(item.id);
      if (now && now.item.completed === completed) void toggle(now);
    };
    if (!completed) undoable(t("Back on the to do list"), back);
    else if (item.repeat && task.day) undoable(t("Done · next one on {date}", { date: dayWord(nextOnRule(item.repeat, task.day < today ? today : task.day), today, t, fmt) }), back);
    else undoable(t("Task done"), back);
  }

  // Moves tasks to a day or to Someday; a repeating task's copy whose rule
  // is already there stays put (the server says how many).
  async function move(tasks: BoardTask[], to: string | null, quiet = false): Promise<void> {
    const moving = tasks.filter((task) => task.day !== to && !busy.has(task.item.id) && !isPendingList(task.listId));
    if (moving.length === 0) return;
    const ids = moving.map((task) => task.item.id);
    mark(ids, true);
    moveLocally(moving, to);
    let moved = 0;
    if (moving.length === 1) {
      const result = await updateTodoItemAction(moving[0].listId, ids[0], { date: to });
      if (result.success) moved = 1;
      else fail(result.message, "Failed to move task");
    } else {
      const result = await moveTodoItemsAction(ids, to);
      if (result.success && result.data) moved = result.data.moved;
      else fail(result.message, "Failed to move task");
    }
    mark(ids, false);
    refresh();
    if (quiet || moved === 0) return;
    const undo = async () => {
      await Promise.all(
        moving.map(async (was) => {
          const now = locate(was.item.id);
          if (!now || now.day === was.day) return;
          const result = await updateTodoItemAction(now.listId, was.item.id, { date: was.day, movedFrom: was.item.movedFrom, moveCount: was.item.moveCount });
          if (!result.success) fail(result.message, "Failed to move task");
        }),
      );
      refresh();
    };
    undoable(movedMessage(to, moved), undo);
  }

  function movedMessage(to: string | null, count: number): string {
    const many = count > 1;
    const n = formatCount(count, fmt);
    if (to === null) return many ? t("{count} tasks moved to Someday", { count: n }) : t("Moved to Someday");
    if (to === today) return many ? t("{count} tasks moved to today", { count: n }) : t("Moved to today");
    if (to === shiftDay(today, 1)) return many ? t("{count} tasks moved to tomorrow", { count: n }) : t("Moved to tomorrow");
    const date = dayWord(to, today, t, fmt);
    return many ? t("{count} tasks moved to {date}", { count: n, date }) : t("Moved to {date}", { date });
  }

  // The popup's Save: what changed, and the way back for Undo.
  async function save(task: BoardTask, changes: TodoItemChanges): Promise<boolean> {
    const { item } = task;
    if (busy.has(item.id) || isPendingList(task.listId)) return false;
    mark([item.id], true);
    const moving = changes.date !== undefined && changes.date !== task.day;
    if (moving) moveLocally([task], changes.date ?? null);
    const result = await updateTodoItemAction(task.listId, item.id, changes);
    mark([item.id], false);
    if (!result.success || !result.data) {
      fail(result.message, "Failed to update task");
      if (moving) refresh();
      return false;
    }
    take(result.data);
    if (moving || changes.repeat !== undefined || (item.repeat && Object.keys(changes).length > 0)) refresh();
    const back: TodoItemChanges = {};
    if (changes.text !== undefined) back.text = item.text;
    if (changes.priority !== undefined) back.priority = item.priority;
    if (changes.dueTime !== undefined) back.dueTime = item.dueTime;
    if (changes.remindBefore !== undefined) back.remindBefore = item.remindBefore ?? null;
    if (changes.categoryId !== undefined) back.categoryId = item.categoryId;
    if (changes.note !== undefined) back.note = item.note;
    if (changes.steps !== undefined) back.steps = item.steps;
    if (changes.completed !== undefined) back.completed = item.completed;
    if (moving) Object.assign(back, { date: task.day, movedFrom: item.movedFrom, moveCount: item.moveCount });
    if (changes.repeat !== undefined) back.repeat = item.repeat ? { kind: item.repeat.kind, ...(item.repeat.kind === "WEEKLY" && { weekdays: item.repeat.weekdays }) } : null;
    undoable(t("Changes saved"), async () => {
      const now = locate(item.id);
      if (!now) return;
      const undone = await updateTodoItemAction(now.listId, item.id, back);
      if (undone.success && undone.data) take(undone.data);
      else fail(undone.message, "Failed to update task");
      refresh();
    });
    return true;
  }

  async function remove(task: BoardTask, quiet = false): Promise<boolean> {
    const { item } = task;
    if (isPendingList(task.listId)) return false;
    mark([item.id], true);
    const result = await removeTodoItemAction(task.listId, item.id);
    mark([item.id], false);
    if (!result.success || !result.data) {
      fail(result.message, "Failed to remove task");
      return false;
    }
    take(result.data);
    if (!quiet) undoable(t("Task deleted"), () => void add(restoreOf(task), true));
    return true;
  }

  async function duplicate(task: BoardTask) {
    const { item } = task;
    const copy: NewTask = {
      date: task.day,
      text: item.text,
      priority: item.priority,
      dueTime: item.dueTime,
      remindBefore: item.remindBefore ?? null,
      categoryId: item.categoryId,
      note: item.note,
      steps: item.steps.map((step) => ({ text: step.text, done: false })),
    };
    const result = await createTaskAction(copy);
    if (!result.success || !result.data) {
      fail(result.message, "Failed to add task");
      return;
    }
    const before = latest.current.find((each) => each.id === result.data!.id);
    const added = addedItem(before, result.data);
    take(result.data);
    if (added) undoable(t("Task copied"), () => void remove({ item: added, listId: result.data!.id, day: result.data!.date }, true));
  }

  async function addCategory(name: string, color: TodoColor): Promise<TodoCategory | null> {
    const result = await createTodoCategoryAction(name, color);
    if (!result.success || !result.data) {
      fail(result.message, "Failed to add the list");
      return null;
    }
    const created = result.data;
    setCategories((current) => [...current, created]);
    undoable(t("List added"), () => void removeCategory(created, true));
    return created;
  }

  async function removeCategory(category: TodoCategory, quiet = false): Promise<boolean> {
    const result = await deleteTodoCategoryAction(category.id);
    if (!result.success) {
      fail(result.message, "Failed to delete the list");
      return false;
    }
    setCategories((current) => current.filter((each) => each.id !== category.id));
    // Its tasks go back under Personal, as the server files them.
    setLists((current) => current.map((list) => ({ ...list, items: list.items.map((item) => (item.categoryId === category.id ? { ...item, categoryId: null } : item)) })));
    if (!quiet) toast.success(t("List deleted"));
    refresh();
    return true;
  }

  return { lists, categories, busy, add, toggle, move, save, remove, duplicate, addCategory, removeCategory };
}

export type TodoBoard = ReturnType<typeof useTodoBoard>;
