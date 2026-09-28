"use client";

import { CheckCircle2, ChevronLeft, Circle, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { TodoList } from "@/lib/api";
import { addTodoItemAction, removeTodoItemAction, updateTodoItemAction } from "@/lib/todosActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatTodoDate } from "./todoDate";

type OptimisticUpdate = { type: "toggle"; itemId: string; completed: boolean } | { type: "remove"; itemId: string };

// One date's flat checklist -- no day-count grid at all, unlike Ramadan/
// Others (this is one day, not a multi-day sheet). A task can be deleted at
// any time regardless of completed state, matching the list-level "no lock"
// delete rule.
export function TodosDetailPageClient({ list }: { list: TodoList }) {
  const router = useRouter();
  const { t } = useLocale();
  const [newText, setNewText] = useState("");
  const [removeTarget, setRemoveTarget] = useState<{ id: string; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [, startToggleTransition] = useTransition();
  // A toggle and a delete on the SAME item can otherwise race (fire the
  // toggle, then quickly delete before the toggle's PATCH resolves) and
  // surface a spurious "Task not found" error for a deletion the user
  // actually wanted -- disabling both actions on an item while either is in
  // flight rules that out, same pattern as the Skills quick-add fix.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

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

  // Server props stay the source of truth; a change is layered on top
  // optimistically and disappears once the transition (request + refresh) ends.
  const [optimisticList, applyOptimistic] = useOptimistic(list, (current, update: OptimisticUpdate) =>
    update.type === "toggle"
      ? { ...current, items: current.items.map((i) => (i.id === update.itemId ? { ...i, completed: update.completed } : i)) }
      : { ...current, items: current.items.filter((i) => i.id !== update.itemId) },
  );

  const done = optimisticList.items.filter((i) => i.completed).length;
  const total = optimisticList.items.length;
  // Newest task first: addItem() appends server-side, so reversing here (a
  // display-only order, not stored) puts whatever was just added at the top
  // instead of the bottom, same as the Others tracker's habit rows.
  const displayItems = [...optimisticList.items].reverse();

  function toggleItem(itemId: string, completed: boolean) {
    if (pendingIds.has(itemId)) return;
    startToggleTransition(() =>
      withPending(itemId, async () => {
        applyOptimistic({ type: "toggle", itemId, completed });
        const result = await updateTodoItemAction(list.id, itemId, { completed });
        if (!result.success) toast.error(result.message ?? t("Failed to update task"));
        router.refresh();
      }),
    );
  }

  function addTask(rawText: string) {
    const text = rawText.trim();
    if (!text) return;
    startTransition(async () => {
      const result = await addTodoItemAction(list.id, text);
      if (result.success) setNewText("");
      else toast.error(result.message ?? t("Failed to add task"));
      router.refresh();
    });
  }

  function handleRemove() {
    if (!removeTarget) return;
    const itemId = removeTarget.id;
    startTransition(() =>
      withPending(itemId, async () => {
        applyOptimistic({ type: "remove", itemId });
        const result = await removeTodoItemAction(list.id, itemId);
        setRemoveTarget(null);
        if (!result.success) toast.error(result.message ?? t("Failed to remove task"));
        router.refresh();
      }),
    );
  }

  return (
    <div className="space-y-5 px-6 py-8 pb-24 md:pb-8">
      <div>
        <Link href="/habit-tracker/todos" className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-700">
          <ChevronLeft className="h-3.5 w-3.5" /> {t("All Lists")}
        </Link>
        <h1 className="text-xl font-semibold text-neutral-900">{formatTodoDate(list.date)}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {done}/{total} {t("tasks")}
        </p>
      </div>

      <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addTask(newText);
          }}
          className="mb-4 flex items-center gap-2"
        >
          <input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            maxLength={200}
            placeholder={t("Add a task")}
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

        {optimisticList.items.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-400">{t("No tasks yet -- add one above.")}</p>
        ) : (
          <div className="space-y-2">
            {displayItems.map((item, index) => {
              const itemPending = pendingIds.has(item.id);
              return (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3">
                  <span className="w-4 shrink-0 text-xs tabular-nums text-neutral-400">{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id, !item.completed)}
                    disabled={itemPending}
                    aria-label={item.completed ? t("Undo") : t("Mark done")}
                    title={item.completed ? t("Undo") : t("Mark done")}
                    className={`shrink-0 rounded-full transition-colors disabled:opacity-50 ${item.completed ? "text-emerald-500" : "text-neutral-300 hover:text-neutral-400"}`}
                  >
                    {item.completed ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                  </button>
                  <p className={`min-w-0 flex-1 truncate text-sm ${item.completed ? "text-neutral-400 line-through" : "text-neutral-800"}`}>{item.text}</p>
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
      </div>

      <ConfirmModal
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        isPending={isPending}
        title={t("Delete Task")}
        message={removeTarget ? `${t("Delete")} "${removeTarget.text}"? ${t("This cannot be undone.")}` : ""}
        confirmLabel={t("Delete")}
      />
    </div>
  );
}
