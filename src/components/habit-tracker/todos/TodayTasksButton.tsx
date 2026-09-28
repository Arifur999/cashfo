"use client";

import { ArrowRight, CheckCircle2, Circle, ListTodo, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import type { TodoList } from "@/lib/api";
import {
  addTodoItemAction,
  createTodoListAction,
  getTodayTodoListAction,
  moveTodoItemToNextDayAction,
  removeTodoItemAction,
  updateTodoItemAction,
} from "@/lib/todosActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatTodoDate } from "./todoDate";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// TopBar quick-access to today's to-do list -- shown in BOTH app modes
// (unlike QuickAddButton, which is Money Tracker-only): a to-do list is a
// cross-cutting daily-planning tool, not specific to habit tracking, even
// though its full page lives under /habit-tracker. Today's list doesn't have
// to exist yet: adding the first task here creates it transparently, so this
// stays a one-click "jot something down" action rather than a two-step
// "create a list, then add to it" flow.
export function TodayTasksButton() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<TodoList | null>(null);
  const [newText, setNewText] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [removeTarget, setRemoveTarget] = useState<{ id: string; text: string } | null>(null);

  function withPending<T>(itemId: string, fn: () => Promise<T>): Promise<T> {
    setPendingIds((prev) => new Set(prev).add(itemId));
    return fn().finally(() => {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    });
  }

  async function handleOpen() {
    setOpen(true);
    setLoading(true);
    const result = await getTodayTodoListAction();
    setList(result.success ? (result.data ?? null) : null);
    setLoading(false);
  }

  async function addTask(rawText: string) {
    const text = rawText.trim();
    if (!text || isPending) return;
    setIsPending(true);
    try {
      let target = list;
      if (!target) {
        const created = await createTodoListAction(todayKey());
        if (!created.success || !created.data) {
          toast.error(created.message ?? t("Failed to create list"));
          return;
        }
        target = created.data;
        setList(target);
      }
      const result = await addTodoItemAction(target.id, text);
      if (result.success && result.data) {
        setList(result.data);
        setNewText("");
      } else {
        toast.error(result.message ?? t("Failed to add task"));
      }
    } finally {
      setIsPending(false);
    }
  }

  function toggleItem(itemId: string, completed: boolean) {
    if (!list || pendingIds.has(itemId)) return;
    withPending(itemId, async () => {
      const result = await updateTodoItemAction(list.id, itemId, { completed });
      if (result.success && result.data) setList(result.data);
      else toast.error(result.message ?? t("Failed to update task"));
    });
  }

  function moveToNextDay(itemId: string) {
    if (!list || pendingIds.has(itemId)) return;
    withPending(itemId, async () => {
      const result = await moveTodoItemToNextDayAction(list.id, itemId);
      if (result.success && result.data) {
        setList(result.data);
        toast.success(t("Moved to next day"));
      } else {
        toast.error(result.message ?? t("Failed to move task"));
      }
    });
  }

  function handleRemove() {
    if (!list || !removeTarget) return;
    const itemId = removeTarget.id;
    withPending(itemId, async () => {
      const result = await removeTodoItemAction(list.id, itemId);
      setRemoveTarget(null);
      if (result.success && result.data) setList(result.data);
      else toast.error(result.message ?? t("Failed to remove task"));
    });
  }

  const items = list?.items ?? [];
  const done = items.filter((i) => i.completed).length;
  // Newest task first, same reasoning as TodosDetailPageClient's own
  // displayItems: addItem() appends server-side, so this is a display-only
  // reorder, not a stored one.
  const displayItems = [...items].reverse();

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={t("Today's Tasks")}
        title={t("Today's Tasks")}
        className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
      >
        <ListTodo className="h-4 w-4 text-teal-600" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t("Today's Tasks")}>
        <p className="mb-3 text-xs text-neutral-400">{formatTodoDate(todayKey())}</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addTask(newText);
          }}
          className="mb-3 flex items-center gap-2"
        >
          <input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            maxLength={200}
            placeholder={t("Add a task")}
            autoFocus
            className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
          <button
            type="submit"
            disabled={!newText.trim() || isPending}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {t("Add")}
          </button>
        </form>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">{t("No tasks yet -- add one above.")}</p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {displayItems.map((item, index) => {
              const itemPending = pendingIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 rounded-xl border bg-surface p-2.5 transition-colors ${
                    item.completed ? "border-teal-100 bg-[image:linear-gradient(rgb(20_184_166/0.08),rgb(20_184_166/0.08))]" : "border-neutral-100 hover:border-orange-200"
                  }`}
                >
                  <span className="w-4 shrink-0 text-xs tabular-nums text-neutral-400">{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id, !item.completed)}
                    disabled={itemPending}
                    aria-label={item.completed ? t("Undo") : t("Mark done")}
                    title={item.completed ? t("Undo") : t("Mark done")}
                    className={`shrink-0 rounded-full transition-colors disabled:opacity-50 ${item.completed ? "text-teal-500" : "text-neutral-300 hover:text-orange-400"}`}
                  >
                    {item.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </button>
                  <p className={`min-w-0 flex-1 truncate text-sm ${item.completed ? "text-neutral-400 line-through" : "text-neutral-800"}`}>{item.text}</p>
                  {!item.completed && (
                    <button
                      type="button"
                      onClick={() => moveToNextDay(item.id)}
                      disabled={itemPending}
                      aria-label={`${t("Move to next day")}: ${item.text}`}
                      title={t("Move to next day")}
                      className="shrink-0 rounded-md p-1 text-neutral-300 transition-colors hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setRemoveTarget({ id: item.id, text: item.text })}
                    disabled={itemPending}
                    aria-label={`${t("Delete")}: ${item.text}`}
                    title={t("Delete")}
                    className="shrink-0 rounded-md p-1 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-brand-danger disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {list && (
          <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-400">
            <span>
              {done}/{items.length} {t("tasks")}
            </span>
            <Link href={`/habit-tracker/todos/${list.id}`} onClick={() => setOpen(false)} className="font-medium text-brand-primary hover:underline">
              {t("Open full list")}
            </Link>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        title={t("Delete Task")}
        message={removeTarget ? `${t("Delete")} "${removeTarget.text}"? ${t("This cannot be undone.")}` : ""}
        confirmLabel={t("Delete")}
      />
    </>
  );
}
