"use client";

import { ArrowDown, ChevronRight, Landmark, Lock, Play, Plus, TrendingUp } from "lucide-react";
import Chip from "@/components/smartly/Chip";
import type { SavingsGoal } from "@/lib/customer/api";
import { LOOK_META } from "@/lib/customer/savingsDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GoalMenu } from "./GoalMenu";
import { useGoalView, type GoalAction } from "./useGoalView";

export type { GoalAction } from "./useGoalView";

interface GoalCardProps {
  goal: SavingsGoal;
  color: string;
  currency: string;
  today: string;
  canManage: boolean;
  // No savings wallet yet: money can't go in until one is added.
  noWallet: boolean;
  // Another open goal exists to move this one's money to.
  canMoveTo: boolean;
  busy: boolean;
  onAction: (action: GoalAction) => void;
}

// One goal on the Savings goals page (SavingsDashboard board's card): its
// letter, how long it has left, how much of the target is saved against
// where the plan expects it today, the account it keeps its money in,
// where it stands with this month's share, and the next thing to do.
export function GoalCard({ goal, color, currency, today, canManage, noWallet, canMoveTo, busy, onAction }: GoalCardProps) {
  const { t, fmt } = useLocale();
  const view = useGoalView({ goal, color, currency, today, canManage, canMoveTo });
  const { money, tint } = view;
  const pill = "flex h-9.5 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap transition-opacity disabled:opacity-50 pointer-coarse:h-11 [&_svg]:size-3.5";

  return (
    <article
      aria-label={goal.name}
      className={cn("flex min-w-0 flex-col gap-4 rounded-[20px] border p-5 shadow-card", view.behind ? "border-warning-line bg-surface" : view.completed ? "border-success-line bg-success-soft/30" : "border-line-card bg-surface")}
    >
      <div className="flex items-center gap-3">
        <GoalTile initial={view.initial} tint={tint} />
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="flex min-w-0 items-center gap-2">
            <h3 className={cn("min-w-0 truncate text-[16px] leading-[1.3] font-bold", view.closed ? "text-ink-muted" : "text-ink")}>{goal.name}</h3>
            {!view.active && (
              <Chip size="sm" className={cn("shrink-0 px-2 text-[11px] font-bold", LOOK_META[view.look].chip)}>
                {t(LOOK_META[view.look].label)}
              </Chip>
            )}
          </span>
          <span className="truncate text-[12.5px] text-ink-muted">{view.when}</span>
        </span>
        <GoalMenu name={goal.name} items={view.menu} busy={busy} onAction={onAction} />
      </div>

      <div className="flex items-center gap-4.5">
        <div
          role="img"
          aria-label={t("{percent}% saved", { percent: formatCount(view.percent, fmt) })}
          className="flex size-19 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(${tint ?? "var(--input)"} 0 ${view.percent}%, var(--line) ${view.percent}% 100%)` }}
        >
          <span className={cn("flex size-15 items-center justify-center rounded-full text-[16px] font-bold tabular-nums", "bg-surface text-ink", view.completed && "bg-linear-to-b from-success-soft/30 to-success-soft/30", view.closed && "text-ink-faint")}>
            {formatCount(view.percent, fmt)}%
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[24px] leading-[normal] font-bold tracking-[-0.01em] text-ink tabular-nums">{money(view.closed ? goal.withdrawnAmount : view.saved)}</span>
            <span className="text-[13px] text-ink-muted tabular-nums">{t("of {amount}", { amount: money(view.target) })}</span>
            <span className="flex-1" />
            {view.kept && (
              <span title={view.keptTitle} className="inline-flex max-w-42.5 items-center gap-1.25 rounded-full bg-surface-sunken px-2.25 py-0.75 text-[11.5px] font-semibold text-ink-2">
                <Landmark className="size-3 shrink-0 text-ink-soft" strokeWidth={2} aria-hidden="true" />
                <span className="truncate">{view.kept.name}</span>
              </span>
            )}
          </span>
          {view.active ? (
            <>
              <PlanBar percent={view.percent} timePercent={view.timePercent} tint={tint} title={t("The dark line shows where the plan expects you to be today.")} />
              <span className="flex justify-between gap-2 text-[12px] text-ink-muted tabular-nums">
                <span>{view.leftText}</span>
                {goal.pace && (
                  <span className="flex items-center gap-1.25">
                    <span aria-hidden="true" className="h-2.5 w-0.75 rounded-xs bg-ink" />
                    {t("Plan today {amount}", { amount: money(goal.pace.expected) })}
                  </span>
                )}
              </span>
            </>
          ) : (
            view.leftText && <span className="text-[12.5px] text-ink-muted">{view.leftText}</span>
          )}
        </div>
      </div>

      <div className={cn("flex items-center gap-3 rounded-[14px] px-3.5 py-3", view.tone.box)}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-surface/70">
          <view.PaceIcon className="size-4" strokeWidth={2.25} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="text-[14px] font-bold tabular-nums">{view.pace.head}</span>
          <span className="text-[12.5px] opacity-90">{view.pace.text}</span>
        </span>
        {view.chip && <span className={cn("shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap tabular-nums", view.chip.tone)}>{view.chip.text}</span>}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {canManage && view.behind && (
          <button type="button" onClick={() => onAction("catch")} disabled={busy} className={cn(pill, "bg-warning px-4 text-white hover:opacity-90")}>
            <TrendingUp strokeWidth={2.5} aria-hidden="true" />
            {t("Catch up")}
          </button>
        )}
        {canManage && view.active && !noWallet && (
          <button type="button" onClick={() => onAction("add")} disabled={busy} className={cn(pill, "bg-emerald-soft text-emerald hover:bg-mint-50")}>
            <Plus strokeWidth={2.5} aria-hidden="true" />
            {t("Add money")}
          </button>
        )}
        {canManage && view.active && noWallet && (
          <button type="button" onClick={() => onAction("wallet")} title={t("Add a savings account first")} className={cn(pill, "border border-line bg-strip px-3 text-ink-muted hover:border-input")}>
            <Lock strokeWidth={2.5} aria-hidden="true" />
            {t("Add an account first")}
          </button>
        )}
        {canManage && view.paused && (
          <button type="button" onClick={() => onAction("resume")} disabled={busy} className={cn(pill, "bg-emerald text-white hover:bg-emerald-hover")}>
            <Play className="fill-current" strokeWidth={0} aria-hidden="true" />
            {t("Resume goal")}
          </button>
        )}
        {canManage && view.completed && view.saved > 0 && (
          <button type="button" onClick={() => onAction("withdraw")} disabled={busy} className={cn(pill, "bg-success px-4 text-white hover:opacity-90")}>
            <ArrowDown strokeWidth={2.5} aria-hidden="true" />
            {t("Withdraw to balance")}
          </button>
        )}
        <span className="flex-1" />
        <button type="button" onClick={() => onAction("details")} className="flex h-9.5 items-center gap-1 px-2 text-[13px] font-semibold text-emerald hover:text-emerald-hover pointer-coarse:h-11">
          {t("Details")}
          <ChevronRight className="size-3.25" strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

// The goal's letter on its colour (grey once withdrawn).
export function GoalTile({ initial, tint, size = "md" }: { initial: string; tint: string | undefined; size?: "md" | "sm" }) {
  return (
    <span
      aria-hidden="true"
      className={cn("flex shrink-0 items-center justify-center font-bold", size === "md" ? "size-10 rounded-[12px] text-[17px]" : "size-9.5 rounded-[11px] text-[16px]", !tint && "bg-surface-sunken text-ink-faint")}
      style={tint ? { background: `color-mix(in srgb, ${tint} 14%, var(--surface))`, color: tint } : undefined}
    >
      {initial}
    </span>
  );
}

// Saved so far along the bar, and a dark mark where the plan expects the
// goal to be today.
export function PlanBar({ percent, timePercent, tint, title, thin = false }: { percent: number; timePercent: number | null; tint: string | undefined; title?: string; thin?: boolean }) {
  return (
    <div className={cn("relative rounded-full bg-surface-sunken", thin ? "h-2" : "h-2.5")} title={title}>
      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${percent}%`, background: tint ?? "var(--input)" }} />
      {timePercent !== null && <span aria-hidden="true" className={cn("absolute w-0.75 -translate-x-1/2 rounded-xs bg-ink", thin ? "-top-1 h-4" : "-top-1 h-4.5")} style={{ left: `${timePercent}%` }} />}
    </div>
  );
}
