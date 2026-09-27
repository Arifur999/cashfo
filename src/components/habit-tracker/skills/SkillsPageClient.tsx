"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { Skill, SkillStatus, SkillsOverview } from "@/lib/api";
import { deleteSkillAction, updateSkillAction } from "@/lib/skillActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CurrentlyLearning } from "./CurrentlyLearning";
import { EmptySkills } from "./EmptySkills";
import { applyProgress, skillStats } from "./skillMath";
import { SkillFormModal } from "./SkillFormModal";
import { SkillGoalModal } from "./SkillGoalModal";
import { SkillHero } from "./SkillHero";
import { SkillLibrary } from "./SkillLibrary";
import { SkillProgressModal } from "./SkillProgressModal";
import { GoalCard, StatTiles } from "./SkillStats";
import { WeekChart } from "./WeekChart";

// Habits -> Skills: a learner's first page -- a banner with the quote of the
// day, the year's goal and this week's activity, four headline numbers, what is
// being learned right now, and every skill below.
export function SkillsPageClient({ overview, quoteDay }: { overview: SkillsOverview; quoteDay: number }) {
  const router = useRouter();
  const { t } = useLocale();
  const { year, goalTarget, streak, week } = overview;

  // Server props stay the source of truth; a progress change is layered on top
  // optimistically and disappears once the transition (PATCH + refresh) ends.
  const [skills, applyOptimisticProgress] = useOptimistic(overview.skills, (current, update: { id: string; progress: number }) =>
    current.map((skill) => (skill.id === update.id ? applyProgress(skill, update.progress, year) : skill)),
  );
  const [, startProgressTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [, startStatusTransition] = useTransition();

  const [form, setForm] = useState<{ skill: Skill | null } | null>(null); // null = closed; skill null = adding
  const [progressId, setProgressId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  // Skills with a progress request in flight -- their quick-add/Update/Finish
  // buttons are disabled meanwhile, so two rapid clicks can't send two
  // absolute progress values that race each other to the server.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const learning = skills.filter((s) => s.status === "LEARNING");
  const wantToLearn = skills.filter((s) => s.status === "WANT_TO_LEARN");
  const stats = skillStats(skills, year);
  const progressSkill = skills.find((s) => s.id === progressId) ?? null;

  // Marks `id` pending for the duration of `run` -- a second call for the same
  // id while one is already in flight is dropped rather than fired.
  function withPending(id: string, run: () => Promise<void>) {
    if (pendingIds.has(id)) return;
    setPendingIds((prev) => new Set(prev).add(id));
    startProgressTransition(async () => {
      try {
        await run();
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    });
  }

  function setProgress(skill: Skill, requested: number) {
    // "+30 min" on a skill with 10 minutes left means "finish it" -- never more
    // than the target (the server rejects that).
    const progress = Math.min(Math.max(0, requested), skill.target);
    withPending(skill.id, async () => {
      applyOptimisticProgress({ id: skill.id, progress });
      const result = await updateSkillAction(skill.id, { progress });
      if (!result.success) toast.error(result.message ?? t("Failed to update"));
      else if (result.data?.status === "COMPLETED" && skill.status !== "COMPLETED") toast.success(t("Completed! Well done."));
      router.refresh();
    });
  }

  // "Finish" is a status change, not a progress log: the rest of the course
  // wasn't necessarily done today, so it doesn't count as today's activity.
  function finish(skill: Skill) {
    withPending(skill.id, async () => {
      applyOptimisticProgress({ id: skill.id, progress: skill.target });
      const result = await updateSkillAction(skill.id, { status: "COMPLETED" });
      if (result.success) toast.success(t("Completed! Well done."));
      else toast.error(result.message ?? t("Failed to update"));
      router.refresh();
    });
  }

  function changeStatus(skill: Skill, status: SkillStatus, successMessage: string) {
    startStatusTransition(async () => {
      const result = await updateSkillAction(skill.id, { status });
      if (result.success) toast.success(t(successMessage));
      else toast.error(result.message ?? t("Failed to update"));
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startDeleteTransition(async () => {
      const result = await deleteSkillAction(target.id);
      if (result.success) {
        toast.success(t("Skill removed"));
        setDeleteTarget(null);
      } else {
        toast.error(result.message ?? t("Failed to remove skill"));
      }
      router.refresh();
    });
  }

  const openAdd = () => setForm({ skill: null });
  const openEdit = (skill: Skill) => setForm({ skill });
  const start = (skill: Skill) => changeStatus(skill, "LEARNING", "Started -- happy learning!");

  return (
    <div className="space-y-6 px-6 py-8 pb-24 md:pb-8">
      <SkillHero quoteDay={quoteDay} onAdd={openAdd} />

      {skills.length === 0 ? (
        <EmptySkills onAdd={openAdd} />
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
            <GoalCard completedThisYear={stats.completedThisYear} year={year} goalTarget={goalTarget} onEditGoal={() => setGoalOpen(true)} />
            <WeekChart week={week} />
          </div>
          <StatTiles stats={stats} streak={streak} />
          <CurrentlyLearning
            learning={learning}
            wantToLearn={wantToLearn}
            pendingIds={pendingIds}
            onQuickAdd={(skill, amount) => setProgress(skill, skill.progress + amount)}
            onUpdate={(skill) => setProgressId(skill.id)}
            onFinish={finish}
            onStart={start}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onAdd={openAdd}
          />
          <SkillLibrary skills={skills} onStart={start} onUpdate={(skill) => setProgressId(skill.id)} onLearnAgain={start} onEdit={openEdit} onDelete={setDeleteTarget} />
        </>
      )}

      <SkillFormModal open={form !== null} onClose={() => setForm(null)} skill={form?.skill ?? null} />
      <SkillProgressModal
        skill={progressSkill}
        onClose={() => setProgressId(null)}
        onSave={(skill, progress) => {
          setProgressId(null);
          setProgress(skill, progress);
        }}
      />
      <SkillGoalModal open={goalOpen} onClose={() => setGoalOpen(false)} year={year} current={goalTarget} />
      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isPending={isDeleting}
        title={t("Remove skill")}
        message={deleteTarget ? `${t("Remove")} "${deleteTarget.name}"? ${t("Your progress on it will be lost.")}` : ""}
        confirmLabel={t("Remove")}
      />
    </div>
  );
}
