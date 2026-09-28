"use client";

import { Plus, Sunrise, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { TodoList } from "@/lib/api";
import { deleteTodoListAction } from "@/lib/todosActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { TODO_THEME } from "../tracker/theme";
import { TrackerHero } from "../tracker/TrackerHero";
import { CreateTodoListModal } from "./CreateTodoListModal";
import { formatTodoDate } from "./todoDate";

// Habit Tracker -> To Do List: a themed banner (teal-night-to-coral-sunrise,
// see tracker/theme.ts's TODO_THEME) matching the Ramadan/Library family's
// look, "Add List", then one card per date -- any number of tasks inside, no
// lock on delete (a to-do is disposable, unlike Ramadan/Others' protected
// tick history).
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
      <TrackerHero theme={TODO_THEME} watermark={Sunrise} title={t("To Do List")} subtitle={t("Ride today's momentum -- carry what's left into tomorrow's sunrise.")}>
        <button type="button" onClick={() => setFormOpen(true)} className={TODO_THEME.cta}>
          <Plus className="h-4 w-4" /> {t("Add List")}
        </button>
      </TrackerHero>

      {lists.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl bg-surface px-6 py-14 text-center shadow-sm shadow-black/5">
          <Sunrise className={`mb-3 h-10 w-10 ${TODO_THEME.emptyIcon}`} />
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
                  className={`block overflow-hidden rounded-2xl border ${TODO_THEME.cardBorder} bg-surface shadow-sm shadow-black/5 transition hover:-translate-y-0.5 hover:shadow-md`}
                >
                  <div className={`relative bg-gradient-to-r ${TODO_THEME.cardHeader} px-5 py-4 text-white`}>
                    <Sunrise aria-hidden className={`pointer-events-none absolute -right-2 -top-3 h-20 w-20 ${TODO_THEME.heroWatermark}`} />
                    <p className={`text-xs font-medium ${TODO_THEME.cardSub}`}>
                      {done}/{total} {t("tasks")}
                    </p>
                    <h2 className="text-lg font-semibold">{formatTodoDate(list.date)}</h2>
                  </div>
                  <div className="px-5 py-4">
                    <div className="mb-2 flex items-center justify-end text-xs text-neutral-500">
                      <span className="font-semibold tabular-nums text-neutral-700">{pct}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
                      <div className={`h-full rounded-full bg-gradient-to-r ${TODO_THEME.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </Link>
                {/* A sibling of the Link, not nested inside it (a button inside a link is invalid). */}
                <button
                  type="button"
                  onClick={() => setDeleteTarget(list)}
                  aria-label={`${t("Delete")}: ${formatTodoDate(list.date)}`}
                  title={t("Delete")}
                  className="absolute right-3 top-3 rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
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
