"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { budgetCategoryColorClass, budgetCategoryIcon } from "@/lib/budgetCategoryVisuals";
import { deleteHabitAction, updateHabitAction } from "@/lib/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Habit } from "@/lib/api";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { HabitFormModal } from "./HabitFormModal";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function frequencyLabel(habit: Habit, t: (s: string) => string): string {
  if (habit.frequencyType === "WEEKLY_DAYS") return habit.weeklyDays.map((d) => t(WEEKDAY_SHORT[d])).join(", ") || "--";
  if (habit.frequencyType === "WEEKLY_COUNT") return `${habit.weeklyCount ?? 0}${t("x/week")}`;
  return t("Every day");
}

export function HabitsListPageClient({ habits }: { habits: Habit[] }) {
  const router = useRouter();
  const { t } = useLocale();
  const [formOpen, setFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "archived">("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleHabits =
    statusFilter === "active" ? habits.filter((h) => !h.isArchived) : statusFilter === "archived" ? habits.filter((h) => h.isArchived) : habits;

  function openCreate() {
    setEditingHabit(null);
    setFormOpen(true);
  }

  function openEdit(habit: Habit) {
    setEditingHabit(habit);
    setFormOpen(true);
  }

  function toggleArchive(habit: Habit) {
    setTogglingId(habit.id);
    startTransition(async () => {
      const result = await updateHabitAction(habit.id, { isArchived: !habit.isArchived });
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to update habit"));
      }
      setTogglingId(null);
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      const result = await deleteHabitAction(target.id);
      if (result.success) {
        toast.success(result.data?.action === "archived" ? t("This habit has history, so it was archived instead") : t("Habit removed"));
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to remove habit"));
      }
    });
  }

  return (
    <div className="space-y-6 px-6 py-8 pb-24 md:pb-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("Habits")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("Manage the habits you're tracking.")}</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | "active" | "archived")}
          className="rounded-xl border border-neutral-200 px-3.5 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">{t("All")}</option>
          <option value="active">{t("Active")}</option>
          <option value="archived">{t("Archived")}</option>
        </select>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
        >
          <Plus className="h-4 w-4" /> {t("Add Habit")}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">{t("Name")}</th>
              <th className="px-4 py-3">{t("Frequency")}</th>
              <th className="px-4 py-3">{t("Target")}</th>
              <th className="px-4 py-3">{t("Status")}</th>
              <th className="px-4 py-3 text-right">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {visibleHabits.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-neutral-400">
                  {t("No habits yet.")}
                </td>
              </tr>
            )}
            {visibleHabits.map((habit, index) => {
              const Icon = budgetCategoryIcon(habit.icon);
              return (
                <tr key={habit.id}>
                  <td className="px-4 py-3 text-neutral-400">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${budgetCategoryColorClass(habit.color)}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="font-medium text-neutral-800">{habit.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{frequencyLabel(habit, t)}</td>
                  <td className="px-4 py-3 text-neutral-600">{habit.targetValue ? `${habit.targetValue} ${habit.unit ?? ""}`.trim() : "--"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={togglingId === habit.id}
                      onClick={() => toggleArchive(habit)}
                      title={t("Click to toggle")}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                        habit.isArchived ? "bg-neutral-100 text-neutral-500" : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      {habit.isArchived ? t("Archived") : t("Active")}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(habit)}
                        title={t("Edit")}
                        className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(habit)}
                        title={t("Delete")}
                        className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-brand-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <HabitFormModal open={formOpen} onClose={() => setFormOpen(false)} editingHabit={editingHabit} />
      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isPending={isPending}
        title={t("Remove Habit")}
        message={deleteTarget ? `${t("Delete")} "${deleteTarget.name}"? ${t("This cannot be undone.")}` : ""}
        confirmLabel={t("Delete")}
      />
    </div>
  );
}
