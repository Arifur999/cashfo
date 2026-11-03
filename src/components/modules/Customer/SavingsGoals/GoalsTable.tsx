"use client";

import { ArrowDown, Landmark, Lock, Play, Plus, TrendingUp } from "lucide-react";
import IconAction from "@/components/smartly/IconAction";
import Chip from "@/components/smartly/Chip";
import type { SavingsGoal } from "@/lib/customer/api";
import { LOOK_META } from "@/lib/customer/savingsDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GoalTile, PlanBar } from "./GoalCard";
import { GoalMenu } from "./GoalMenu";
import { useGoalView, type GoalAction } from "./useGoalView";

interface GoalsTableProps {
  goals: SavingsGoal[];
  colorOf: (goal: SavingsGoal) => string;
  currency: string;
  today: string;
  canManage: boolean;
  noWallet: boolean;
  canMoveTo: (goal: SavingsGoal) => boolean;
  busy: boolean;
  onAction: (goal: SavingsGoal, action: GoalAction) => void;
  // The row under the goals that opens New goal (All, unfiltered).
  onNew: (() => void) | null;
}

// Goal, Saved, Status, This month and the row's buttons; phones scroll it
// sideways.
const COLUMNS = "grid grid-cols-[minmax(0,1.1fr)_230px_minmax(0,1fr)_172px_118px] items-center gap-x-4 min-w-230";

// Savings goals as a table (SavingsTable board): a row per goal that opens
// its details, with the same next steps as the card as small buttons.
export function GoalsTable({ goals, colorOf, currency, today, canManage, noWallet, canMoveTo, busy, onAction, onNew }: GoalsTableProps) {
  const { t } = useLocale();
  return (
    <section aria-label={t("Goals table")} className="overflow-x-auto rounded-card border border-line-card bg-surface shadow-card">
      <div className={cn(COLUMNS, "rounded-t-card border-b border-line bg-strip px-5 py-3 text-[12px] font-medium text-ink-muted")}>
        <span>{t("Goal")}</span>
        <span>{t("Saved")}</span>
        <span>{t("Status")}</span>
        <span>{t("This month")}</span>
        <span />
      </div>
      {goals.map((goal) => (
        <GoalRow
          key={goal.id}
          goal={goal}
          color={colorOf(goal)}
          currency={currency}
          today={today}
          canManage={canManage}
          noWallet={noWallet}
          canMoveTo={canMoveTo(goal)}
          busy={busy}
          onAction={(action) => onAction(goal, action)}
        />
      ))}
      {onNew && (
        <div className="min-w-230 border-t border-divider p-3">
          <button type="button" onClick={onNew} className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-input text-[14px] font-semibold text-emerald hover:border-emerald hover:bg-emerald-soft/40">
            <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
            {t("New goal")}
          </button>
        </div>
      )}
    </section>
  );
}

function GoalRow({ goal, color, currency, today, canManage, noWallet, canMoveTo, busy, onAction }: { goal: SavingsGoal; color: string; currency: string; today: string; canManage: boolean; noWallet: boolean; canMoveTo: boolean; busy: boolean; onAction: (action: GoalAction) => void }) {
  const { t, fmt } = useLocale();
  const view = useGoalView({ goal, color, currency, today, canManage, canMoveTo });
  const { money, tint } = view;

  return (
    <div className="relative min-w-230 border-t border-divider">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onAction("details")}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onAction("details");
          }
        }}
        aria-label={t("{name}: details", { name: goal.name })}
        className={cn(COLUMNS, "min-h-18 cursor-pointer px-5 py-2.5 outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-inset", view.behind && "bg-warning-50/60")}
      >
        <span className="flex min-w-0 items-center gap-3">
          <GoalTile initial={view.initial} tint={tint} size="sm" />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex min-w-0 items-center gap-2">
              <span className={cn("truncate text-[14.5px] font-semibold", view.closed ? "text-ink-muted" : "text-ink")}>{goal.name}</span>
              {!view.active && (
                <Chip tone={LOOK_META[view.look].chip} size="sm" className="shrink-0 px-2 text-[11px] font-bold">
                  {t(LOOK_META[view.look].label)}
                </Chip>
              )}
            </span>
            <span className="truncate text-[12px] text-ink-muted">{view.when}</span>
          </span>
        </span>

        <span className="flex min-w-0 flex-col gap-1.75" title={[goal.pace && view.active ? t("Plan today {amount}", { amount: money(goal.pace.expected) }) : "", view.leftText].filter(Boolean).join(" · ")}>
          <span className="flex items-baseline gap-1.5 whitespace-nowrap tabular-nums">
            <span className="text-[15px] font-bold text-ink">{money(view.closed ? goal.withdrawnAmount : view.saved)}</span>
            <span className="text-[12px] text-ink-muted">{t("of {amount}", { amount: money(view.target) })}</span>
            <span className="flex-1" />
            <span className={cn("text-[12.5px] font-bold", view.closed ? "text-ink-faint" : "text-ink")}>{formatCount(view.percent, fmt)}%</span>
          </span>
          <PlanBar percent={view.percent} timePercent={view.active ? view.timePercent : null} tint={tint} thin />
          {view.kept && (
            <span title={view.keptTitle} className="-mt-0.5 flex items-center gap-1.25 overflow-hidden text-[11.5px] whitespace-nowrap text-ink-muted">
              <Landmark className="size-3 shrink-0" strokeWidth={2.25} aria-hidden="true" />
              <span className="truncate">{view.kept.name}</span>
            </span>
          )}
        </span>

        <span className="flex min-w-0 items-center gap-2.5" title={view.pace.text}>
          <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-[9px]", view.tone.tile)}>
            <view.PaceIcon className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col gap-px">
            <span className={cn("truncate text-[13.5px] font-bold tabular-nums", view.tone.head)}>{view.pace.head}</span>
            <span className="truncate text-[12px] text-ink-muted">{view.pace.short}</span>
          </span>
        </span>

        <span className="flex min-w-0 items-center">
          {view.chip ? <span className={cn("max-w-full truncate rounded-full px-2.5 py-1 text-[11.5px] font-bold tabular-nums", view.chip.row)}>{view.chip.text}</span> : <span className="text-[13px] text-ink-faint">–</span>}
        </span>
        <span />
      </div>

      {/* Outside the row's button: a button can't hold buttons. */}
      <div className="absolute top-1/2 right-5 flex -translate-y-1/2 items-center gap-1.5">
        {canManage && view.behind && (
          <IconAction onClick={() => onAction("catch")} disabled={busy} aria-label={t("Catch up")} title={t("Catch up")} className="border-warning-line bg-warning-soft text-warning hover:border-warning-line hover:bg-warning-line hover:text-warning-ink">
            <TrendingUp aria-hidden="true" />
          </IconAction>
        )}
        {canManage && view.active && !noWallet && (
          <IconAction onClick={() => onAction("add")} disabled={busy} aria-label={t("Add money")} title={t("Add money")} className="border-mint-200 bg-emerald-soft text-emerald">
            <Plus aria-hidden="true" />
          </IconAction>
        )}
        {canManage && view.active && noWallet && (
          <IconAction onClick={() => onAction("wallet")} aria-label={t("Add an account first")} title={t("Add an account first")} className="bg-strip">
            <Lock aria-hidden="true" />
          </IconAction>
        )}
        {canManage && view.paused && (
          <IconAction onClick={() => onAction("resume")} disabled={busy} aria-label={t("Resume goal")} title={t("Resume goal")} className="border-mint-200 bg-emerald-soft text-emerald">
            <Play aria-hidden="true" />
          </IconAction>
        )}
        {canManage && view.completed && view.saved > 0 && (
          <IconAction onClick={() => onAction("withdraw")} disabled={busy} aria-label={t("Withdraw to balance")} title={t("Withdraw to balance")} className="border-success-line bg-success-soft text-success-ink hover:border-success-line hover:bg-success-soft hover:text-success-ink">
            <ArrowDown aria-hidden="true" />
          </IconAction>
        )}
        <GoalMenu name={goal.name} items={view.menu} busy={busy} onAction={onAction} />
      </div>
    </div>
  );
}
