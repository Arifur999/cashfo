"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { HabitFormModal } from "@/components/habit-tracker/HabitFormModal";
import type { Habit, HabitStat, HabitToday } from "@/lib/api";
import { deleteHabitAction } from "@/lib/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { weekCompletionPct, type OtherWeekDay } from "@/lib/otherWeek";
import { EmptyOthers } from "./EmptyOthers";
import { OtherChecklist } from "./OtherChecklist";
import { OtherHabitGrid } from "./OtherHabitGrid";
import { OtherHero } from "./OtherHero";
import { overviewStats } from "./otherStats";
import { OtherStatTiles } from "./OtherStatTiles";
import { OtherWeekChart } from "./OtherWeekChart";

interface OthersPageClientProps {
  habits: Habit[]; // Others category, active + archived
  habitsToday: HabitToday[]; // Others category, scheduled today
  stats: HabitStat[]; // Others category, active only
  week: OtherWeekDay[];
  quoteDay: number;
}

// Habits -> Others: the generic habit tracker's first page -- a banner with
// the quote of the day, this week's activity, four headline numbers, today's
// checklist, and every habit below.
export function OthersPageClient({ habits, habitsToday, stats, week, quoteDay }: OthersPageClientProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null);

  const activeHabits = habits.filter((h) => !h.isArchived);
  const overview = overviewStats(habitsToday, activeHabits, stats, weekCompletionPct(week));

  const openAdd = () => {
    setEditingHabit(null);
    setFormOpen(true);
  };
  const openEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setFormOpen(true);
  };

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
      <OtherHero quoteDay={quoteDay} onAdd={openAdd} />

      {habits.length === 0 ? (
        <EmptyOthers onAdd={openAdd} />
      ) : (
        <>
          <OtherStatTiles stats={overview} />
          <OtherWeekChart week={week} />
          <OtherChecklist habitsToday={habitsToday} />
          <OtherHabitGrid habits={habits} stats={stats} onEdit={openEdit} onDelete={setDeleteTarget} />
        </>
      )}

      <HabitFormModal open={formOpen} onClose={() => setFormOpen(false)} editingHabit={editingHabit} defaultCategory="Others" />
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
