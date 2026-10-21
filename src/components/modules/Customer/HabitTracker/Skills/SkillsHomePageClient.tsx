"use client";

import { GraduationCap, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import EmptyState from "@/components/smartly/EmptyState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { Skill, SkillStatus, SkillsOverview } from "@/lib/customer/api";
import { actionError, daysText } from "@/lib/customer/habitDisplay";
import { deleteSkillAction, updateSkillAction } from "@/lib/customer/skillActions";
import { amountText, applyProgress, byStatus, completedIn, namesLine, streakSince, streakStart, weekSums } from "@/lib/customer/skillsDisplay";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { StatCard } from "../Tracker/StatCard";
import { LearningCard } from "./LearningCard";
import { SkillDrawer } from "./SkillDrawer";
import { SkillGoalDialog } from "./SkillGoalDialog";
import { SkillProgressDialog } from "./SkillProgressDialog";
import { SkillsTable, type SkillAction } from "./SkillsTable";
import { ThisWeekCard } from "./ThisWeekCard";

interface SkillsHomePageClientProps {
  overview: SkillsOverview;
  today: string;
}

// How many learning skills get a card of their own; the rest are in the
// table below.
const CARDS = 2;

// Habits › Skills: four numbers, the skills being learned with a quick-add,
// this week's practice and every skill in a table.
export function SkillsHomePageClient({ overview, today }: SkillsHomePageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const { year, goalTarget, streak, week } = overview;
  const count = (n: number) => formatCount(n, locale);

  // Server props stay the source of truth; a progress change is layered on
  // top optimistically and gives way once the PATCH and refresh land.
  const [skills, applyOptimisticProgress] = useOptimistic(overview.skills, (current, update: { id: string; progress: number }) => current.map((skill) => (skill.id === update.id ? applyProgress(skill, update.progress, year) : skill)));
  const [, startProgress] = useTransition();
  const [isPending, startTransition] = useTransition();
  // Skills with a progress request in flight: their buttons wait, so two
  // quick taps can't send two totals that race each other to the server.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const [drawer, setDrawer] = useState<{ open: boolean; editing: Skill | null }>({ open: false, editing: null });
  const [goalOpen, setGoalOpen] = useState(false);
  const [logId, setLogId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Skill | null>(null);

  const learning = byStatus(skills, "LEARNING");
  const completedThisYear = completedIn(skills, year).length;
  const sums = weekSums(week);
  const since = streakStart(streak, week, today);
  const logSkill = skills.find((skill) => skill.id === logId) ?? null;

  function withPending(id: string, run: () => Promise<void>) {
    if (pendingIds.has(id)) return;
    setPendingIds((prev) => new Set(prev).add(id));
    startProgress(async () => {
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
    // Never more than the target; the server rejects that.
    const progress = Math.min(Math.max(0, requested), skill.target);
    withPending(skill.id, async () => {
      applyOptimisticProgress({ id: skill.id, progress });
      const result = await updateSkillAction(skill.id, { progress });
      if (!result.success) toast.error(actionError(result.message, "Failed to update", t, locale));
      else if (result.data?.status === "COMPLETED" && skill.status !== "COMPLETED") toast.success(t("Completed! Well done."));
      router.refresh();
    });
  }

  // Completing is a status change, not a log: the rest of the course wasn't
  // necessarily done today, so it doesn't count as today's practice.
  function complete(skill: Skill) {
    withPending(skill.id, async () => {
      applyOptimisticProgress({ id: skill.id, progress: skill.target });
      const result = await updateSkillAction(skill.id, { status: "COMPLETED" });
      if (result.success) toast.success(t("Completed! Well done."));
      else toast.error(actionError(result.message, "Failed to update", t, locale));
      router.refresh();
    });
  }

  function changeStatus(skill: Skill, status: SkillStatus, successMessage: string) {
    startTransition(async () => {
      const result = await updateSkillAction(skill.id, { status });
      if (result.success) toast.success(t(successMessage));
      else toast.error(actionError(result.message, "Failed to update", t, locale));
      router.refresh();
    });
  }

  function remove() {
    if (!removing) return;
    const target = removing;
    startTransition(async () => {
      const result = await deleteSkillAction(target.id);
      if (result.success) {
        toast.success(t("Skill removed"));
        setRemoving(null);
      } else {
        toast.error(actionError(result.message, "Failed to remove skill", t, locale));
      }
      router.refresh();
    });
  }

  const openAdd = () => setDrawer({ open: true, editing: null });

  function onAction(skill: Skill, action: SkillAction) {
    if (action === "log") setLogId(skill.id);
    else if (action === "complete") complete(skill);
    else if (action === "start" || action === "again") changeStatus(skill, "LEARNING", "Started. Happy learning!");
    else if (action === "edit") setDrawer({ open: true, editing: skill });
    else setRemoving(skill);
  }

  const stats = [
    { label: t("Learning now"), value: count(learning.length), sub: learning.length > 0 ? namesLine(learning.map((skill) => skill.name), t, locale) : t("Nothing on the go yet") },
    { label: t("Practice streak"), value: daysText(streak, t, locale), sub: since ? streakSince(since, streak, t, locale) : t("Log something today to start one") },
    {
      label: t("This week"),
      value: sums.lessons > 0 || sums.minutes === 0 ? amountText("LESSONS", sums.lessons, t, locale) : amountText("HOURS", sums.minutes, t, locale),
      sub: sums.lessons > 0 && sums.minutes > 0 ? t("and {amount} of practice", { amount: amountText("HOURS", sums.minutes, t, locale) }) : sums.lessons + sums.minutes === 0 ? t("Nothing logged yet") : t("across every skill"),
    },
    { label: t("{year} goal", { year: toLocaleDigits(String(year), locale) }), value: goalTarget ? t("{done} of {total}", { done: count(completedThisYear), total: count(goalTarget) }) : count(completedThisYear), sub: goalTarget ? t("Skills completed this year") : t("Completed this year. Set a goal below.") },
  ];

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={t("Habits")}
        tone="habits"
        title={t("Skills")}
        description={t("Courses and skills you're learning, counted in lessons or hours.")}
        actions={
          <Button onClick={openAdd}>
            <Plus strokeWidth={2.25} />
            {t("Add skill")}
          </Button>
        }
      />

      {skills.length === 0 ? (
        <EmptyState icon={<GraduationCap />} tone="habits" title={t("Your learning list is empty, for now")} description={t("Add a course or a skill you want to learn. It takes ten seconds.")} action={<Button onClick={openAdd}>{t("Add skill")}</Button>} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} label={stat.label} value={stat.value} sub={<span className="block truncate">{stat.sub}</span>} />
            ))}
          </div>

          <div className="grid items-stretch gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_380px]">
            {learning.slice(0, CARDS).map((skill) => (
              <LearningCard key={skill.id} skill={skill} week={week} today={today} isPending={pendingIds.has(skill.id)} onQuickAdd={(target, amount) => setProgress(target, target.progress + amount)} onLog={(target) => setLogId(target.id)} />
            ))}
            {learning.length < CARDS && (
              <Card padding="none" className="flex flex-col items-center justify-center gap-2 px-5 py-8 text-center">
                <span className="text-title font-semibold text-ink">{learning.length === 0 ? t("Nothing on the go") : t("Room for one more")}</span>
                <span className="text-small text-ink-muted">{t("Start something from the table below, or add a new skill.")}</span>
                <Button variant="secondary" size="sm" onClick={openAdd} className="mt-1">
                  {t("Add skill")}
                </Button>
              </Card>
            )}
            <ThisWeekCard skills={learning.slice(0, 3)} week={week} streak={streak} today={today} />
          </div>

          <SkillsTable skills={skills} week={week} today={today} year={year} goalTarget={goalTarget} completedThisYear={completedThisYear} onEditGoal={() => setGoalOpen(true)} onAction={onAction} />
        </>
      )}

      <SkillDrawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, editing: null })}
        editing={drawer.editing}
        onRemove={(skill) => {
          setDrawer({ open: false, editing: null });
          setRemoving(skill);
        }}
      />
      <SkillGoalDialog open={goalOpen} onClose={() => setGoalOpen(false)} year={year} current={goalTarget} />
      <SkillProgressDialog
        skill={logSkill}
        onClose={() => setLogId(null)}
        onSave={(skill, progress) => {
          setLogId(null);
          setProgress(skill, progress);
        }}
        onComplete={(skill) => {
          setLogId(null);
          complete(skill);
        }}
      />
      <ConfirmDialog open={removing !== null} onClose={() => setRemoving(null)} onConfirm={remove} isPending={isPending} danger title={t("Remove skill")} description={removing ? t("Remove \"{name}\"? Your progress on it will be lost.", { name: removing.name }) : ""} confirmLabel={t("Remove")} />
    </PageFrame>
  );
}
