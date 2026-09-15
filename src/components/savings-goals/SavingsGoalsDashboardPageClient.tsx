"use client";

import { Minus, PiggyBank, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { SavingsGoal, SavingsGoalPaceStatus, SavingsGoalStatus, SavingsGoalTrend, SavingsOverview } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { deleteSavingsGoalAction, updateSavingsGoalStatusAction } from "@/lib/savingsGoalActions";
import { AddContributionModal } from "./AddContributionModal";
import { GoalActionsMenu } from "./GoalActionsMenu";
import { ProgressRing } from "./ProgressRing";
import { SavingsGoalDetailModal } from "./SavingsGoalDetailModal";
import { SavingsGoalFormModal } from "./SavingsGoalFormModal";
import { SavingsWithdrawModal } from "./SavingsWithdrawModal";

interface SavingsGoalsDashboardPageClientProps {
  businessId: string;
  goals: SavingsGoal[];
  overview: SavingsOverview;
  currency: string;
  canManage: boolean;
}

const FILTER_PILLS: { value: SavingsGoalStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "COMPLETED", label: "Completed" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

// "Are you saving fast enough for the target date" -- only ever set for an
// ACTIVE goal, see SavingsGoalsService.computePaceStatus()'s comment for how
// each tier is derived. No "ahead of pace" badge exists deliberately --
// saving faster than planned is folded into ON_TRACK, never flagged.
const PACE_LABEL: Record<NonNullable<SavingsGoalPaceStatus>, string> = {
  ON_TRACK: "On Track",
  BEHIND: "Behind Schedule",
  WARNING: "Warning",
};
const PACE_BADGE_CLASSES: Record<NonNullable<SavingsGoalPaceStatus>, string> = {
  ON_TRACK: "bg-brand-primary/10 text-brand-primary",
  BEHIND: "bg-amber-100 text-amber-700",
  WARNING: "bg-brand-danger/10 text-brand-danger",
};

// This month's contribution total vs last month's -- a separate signal from
// paceStatus (a goal can be behind overall but trending the right
// direction, or vice versa), see SavingsGoalsService.computeTrend().
const TREND_LABEL: Record<NonNullable<SavingsGoalTrend>, string> = {
  INCREASING: "Increasing",
  DECREASING: "Decreasing",
  STABLE: "Stable",
};
const TREND_ICON: Record<NonNullable<SavingsGoalTrend>, typeof TrendingUp> = {
  INCREASING: TrendingUp,
  DECREASING: TrendingDown,
  STABLE: Minus,
};
const TREND_COLOR: Record<NonNullable<SavingsGoalTrend>, string> = {
  INCREASING: "text-brand-primary",
  DECREASING: "text-brand-danger",
  STABLE: "text-neutral-400",
};

export function SavingsGoalsDashboardPageClient({ businessId, goals, overview, currency, canManage }: SavingsGoalsDashboardPageClientProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<SavingsGoalStatus | "">("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [contributionGoal, setContributionGoal] = useState<SavingsGoal | null>(null);
  const [withdrawGoal, setWithdrawGoal] = useState<SavingsGoal | null>(null);
  const [detailGoalId, setDetailGoalId] = useState<string | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<SavingsGoal | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredGoals = filter ? goals.filter((g) => g.status === filter) : goals;

  function openCreate() {
    setEditingGoal(null);
    setFormOpen(true);
  }

  function openEdit(goal: SavingsGoal) {
    setEditingGoal(goal);
    setFormOpen(true);
  }

  function togglePause(goal: SavingsGoal) {
    startTransition(async () => {
      const result = await updateSavingsGoalStatusAction(businessId, goal.id, goal.status === "PAUSED" ? "ACTIVE" : "PAUSED");
      if (result.success) {
        toast.success(goal.status === "PAUSED" ? "Goal resumed" : "Goal paused");
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to update goal");
      }
    });
  }

  function confirmDelete() {
    if (!deletingGoal) return;
    startTransition(async () => {
      const result = await deleteSavingsGoalAction(businessId, deletingGoal.id);
      if (result.success) {
        toast.success("Goal deleted");
        setDeletingGoal(null);
        router.refresh();
      } else {
        toast.error(result.message ?? "Failed to delete goal");
      }
    });
  }

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Saving Goals</h1>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
          >
            <Plus className="h-4 w-4" /> Add New Goal
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
          <h2 className="mb-4 text-sm font-semibold text-neutral-900">Savings Overview</h2>
          <div className="flex justify-center">
            <ProgressRing percent={overview.progressPercent} label="Progress" />
          </div>

          <div className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Total Saved</span>
              <span className="font-semibold tabular-nums text-neutral-900">{formatCurrency(overview.totalSaved, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Total Goals</span>
              <span className="font-semibold tabular-nums text-neutral-900">{formatCurrency(overview.totalGoals, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Remaining</span>
              <span className="font-semibold tabular-nums text-neutral-900">{formatCurrency(overview.remaining, currency)}</span>
            </div>
          </div>

          <div className="mt-4 border-t border-neutral-100 pt-4">
            <p className="text-sm font-semibold text-neutral-900">Monthly Savings</p>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-neutral-500">Target</span>
              <span className="font-semibold tabular-nums text-neutral-900">{formatCurrency(overview.monthlyTarget, currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Saved This Month</span>
              <span className="font-semibold tabular-nums text-neutral-900">{formatCurrency(overview.savedThisMonth, currency)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-neutral-500">Progress</span>
              <span className="font-medium text-neutral-700">{overview.monthlyProgressPercent}%</span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-brand-primary"
                style={{ width: `${Math.min(100, overview.monthlyProgressPercent)}%` }}
              />
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-neutral-50 p-4 text-center">
            <p className="text-sm text-neutral-500">Savings Rate</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{overview.savingsRatePercent}%</p>
            <p className="text-xs text-neutral-400">of monthly income</p>
          </div>
        </div>

        <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-neutral-900">Saving Goals</h2>
            <div className="flex gap-1 rounded-xl bg-neutral-100 p-1">
              {FILTER_PILLS.map((pill) => (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setFilter(pill.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    filter === pill.value ? "bg-surface text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {filteredGoals.length === 0 ? (
            <p className="px-2 py-10 text-center text-sm text-neutral-400">No savings goals yet.</p>
          ) : (
            <div className="divide-y divide-neutral-50">
              {filteredGoals.map((goal) => (
                <div
                  key={goal.id}
                  className={`py-4 first:pt-0 last:pb-0 ${goal.status === "WITHDRAWN" ? "-mx-3 rounded-xl bg-neutral-50 px-3" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                        <PiggyBank className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">
                          {goal.name}
                          {goal.status !== "ACTIVE" && (
                            <span
                              className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                                goal.status === "WITHDRAWN" ? "bg-brand-primary/10 text-brand-primary" : "bg-neutral-100 text-neutral-500"
                              }`}
                            >
                              {goal.status}
                            </span>
                          )}
                          {goal.paceStatus && (
                            <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${PACE_BADGE_CLASSES[goal.paceStatus]}`}>
                              {PACE_LABEL[goal.paceStatus]}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-neutral-400">Target: {new Date(goal.targetDate).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</p>
                        {goal.status === "WITHDRAWN" && (
                          <p className="text-xs font-medium text-brand-primary">Withdrawn: {formatCurrency(goal.withdrawnAmount, currency)}</p>
                        )}
                        {goal.trend &&
                          (() => {
                            const TrendIcon = TREND_ICON[goal.trend];
                            return (
                              <p className={`mt-0.5 flex items-center gap-1 text-xs ${TREND_COLOR[goal.trend]}`}>
                                <TrendIcon className="h-3 w-3" /> {TREND_LABEL[goal.trend]}
                              </p>
                            );
                          })()}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        {goal.status !== "WITHDRAWN" && (
                          <button
                            type="button"
                            onClick={() => setContributionGoal(goal)}
                            className="rounded-xl border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                          >
                            Add Funds
                          </button>
                        )}
                        <GoalActionsMenu
                          status={goal.status}
                          canWithdraw={goal.status !== "WITHDRAWN" && Number(goal.currentAmount) > 0}
                          onViewDetails={() => setDetailGoalId(goal.id)}
                          onEdit={() => openEdit(goal)}
                          onTogglePause={() => togglePause(goal)}
                          onWithdraw={() => setWithdrawGoal(goal)}
                          onDelete={() => setDeletingGoal(goal)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-neutral-500">
                      {formatCurrency(goal.currentAmount, currency)} of {formatCurrency(goal.targetAmount, currency)}
                    </span>
                    <span className="font-medium text-neutral-700">{goal.progressPercent}%</span>
                  </div>
                  <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div className="h-full rounded-full bg-brand-primary" style={{ width: `${goal.progressPercent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SavingsGoalFormModal open={formOpen} onClose={() => setFormOpen(false)} businessId={businessId} editingGoal={editingGoal} />
      <AddContributionModal open={!!contributionGoal} onClose={() => setContributionGoal(null)} businessId={businessId} goal={contributionGoal} />
      <SavingsWithdrawModal open={!!withdrawGoal} onClose={() => setWithdrawGoal(null)} businessId={businessId} goal={withdrawGoal} currency={currency} />
      <SavingsGoalDetailModal open={!!detailGoalId} onClose={() => setDetailGoalId(null)} businessId={businessId} goalId={detailGoalId} currency={currency} />
      <ConfirmModal
        open={!!deletingGoal}
        onClose={() => setDeletingGoal(null)}
        onConfirm={confirmDelete}
        title="Delete Goal"
        message={`Delete "${deletingGoal?.name}"? This can't be undone. Goals with contributions or transfers must be paused instead.`}
        confirmLabel="Delete"
        isPending={isPending}
      />
    </div>
  );
}
