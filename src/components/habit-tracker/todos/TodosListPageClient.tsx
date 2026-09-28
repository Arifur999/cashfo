"use client";

import { ListTodo, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { TodoList } from "@/lib/api";
import { deleteTodoListAction } from "@/lib/todosActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CreateTodoListModal } from "./CreateTodoListModal";
import { formatTodoDate } from "./todoDate";

// Habit Tracker -> To Do List: a plain header (this is a cross-cutting
// utility page, like the old Calendar/Stats it sits beside in the bottom
// nav, not one of the themed per-category tracker pages), "Add List", then
// one card per date -- any number of tasks inside, no lock on delete (a
// to-do is disposable, unlike Ramadan/Others' protected tick history).
export function TodosListPageClient({ lists }: { lists: TodoList[] }) {
  const router = useRouter();
  const { t } = useLocale();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TodoList | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      const result = await deleteTodoListAction(target.id);
      if (result.success) {
        toast.success(t("List removed"));
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to remove list"));
      }
    });
  }

  return (
    <div className="space-y-6 px-6 py-8 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{t("To Do List")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("Plan your day, one date at a time.")}</p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
        >
          <Plus className="h-4 w-4" /> {t("Add List")}
        </button>
      </div>

      {lists.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl bg-surface px-6 py-14 text-center shadow-sm shadow-black/5">
          <ListTodo className="mb-3 h-10 w-10 text-neutral-300" />
          <p className="text-sm text-neutral-400">{t('No lists yet -- click "Add List" to start.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lists.map((list) => {
            const done = list.items.filter((i) => i.completed).length;
            const total = list.items.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={list.id} className="relative">
                <Link
                  href={`/habit-tracker/todos/${list.id}`}
                  className="block overflow-hidden rounded-2xl border border-neutral-100 bg-surface p-5 shadow-sm shadow-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <h2 className="pr-8 text-sm font-semibold text-neutral-900">{formatTodoDate(list.date)}</h2>
                  <div className="mt-3 mb-2 flex items-center justify-between text-xs text-neutral-500">
                    <span>
                      {done}/{total} {t("tasks")}
                    </span>
                    <span className="font-semibold tabular-nums text-neutral-700">{pct}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
                    <div className="h-full rounded-full bg-brand-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </Link>
                {/* A sibling of the Link, not nested inside it (a button inside a link is invalid). */}
                <button
                  type="button"
                  onClick={() => setDeleteTarget(list)}
                  aria-label={`${t("Delete")}: ${formatTodoDate(list.date)}`}
                  title={t("Delete")}
                  className="absolute right-3 top-3 rounded-lg p-1.5 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-brand-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <CreateTodoListModal open={formOpen} onClose={() => setFormOpen(false)} />
      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isPending={isPending}
        title={t("Remove List")}
        message={deleteTarget ? `${t("Remove")} ${formatTodoDate(deleteTarget.date)}?` : ""}
        confirmLabel={t("Remove")}
      />
    </div>
  );
}
