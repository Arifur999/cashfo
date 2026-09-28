"use client";

import { ArrowRight, CheckCircle2, Circle, Loader2, Plus, Sunrise, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { TodoList } from "@/lib/api";
import { addTodoItemAction, moveTodoItemToNextDayAction, removeTodoItemAction, updateTodoItemAction } from "@/lib/todosActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { TODO_THEME } from "../tracker/theme";
import { TrackerHero } from "../tracker/TrackerHero";
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

  function moveToNextDay(itemId: string) {
    if (pendingIds.has(itemId)) return;
    startTransition(() =>
      withPending(itemId, async () => {
        applyOptimistic({ type: "remove", itemId });
        const result = await moveTodoItemToNextDayAction(list.id, itemId);
        if (result.success) toast.success(t("Moved to next day"));
        else toast.error(result.message ?? t("Failed to move task"));
        router.refresh();
      }),
    );
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
      <TrackerHero
        theme={TODO_THEME}
        watermark={Sunrise}
        title={formatTodoDate(list.date)}
        subtitle={`${done}/${total} ${t("tasks")}`}
        back={{ href: "/habit-tracker/todos", label: t("All Lists") }}
      />

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
          <button type="submit" disabled={!newText.trim() || isPending} className={TODO_THEME.cta}>
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
                <div
                  key={item.id}
                  className={`flex items-center gap-3 rounded-xl border bg-surface p-3 transition-colors ${
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
                    {item.completed ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
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
