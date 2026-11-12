"use client";

import { ArrowDown, ArrowRight, ArrowUpRight, Check, Landmark, Lock, Pause, Play, Plus, TrendingUp, TriangleAlert, type LucideIcon } from "lucide-react";
import type { SavingsGoal } from "@/lib/customer/api";
import { formatDate } from "@/lib/customer/date";
import { LOOK_META } from "@/lib/customer/savingsDisplay";
import { colorButton, deepBand, shade } from "@/lib/customer/savingsColors";
import { monthProgress } from "@/lib/customer/savingsPlan";
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

// A withdrawn goal's card is grey (the board's #7E8A87).
const WITHDRAWN_COLOR = "var(--ink-faint)";

type Stat = { key: string; value: string; tone: string; icon?: LucideIcon; iconTone?: string; bar?: { width: number; tone: string; title: string } };

// One goal on the Savings goals page (SavingsDashboard board's card): a deep
// panel in the goal's own colour with its letter, how long it has left, the
// account it keeps its money in, how much is saved against where the plan
// expects it today; then three facts side by side (where it stands, the
// monthly amount, this month) and the next thing to do.
export function GoalCard({ goal, color, currency, today, canManage, noWallet, canMoveTo, busy, onAction }: GoalCardProps) {
  const { t, fmt } = useLocale();
  const view = useGoalView({ goal, color, currency, today, canManage, canMoveTo, noWallet });
  const { money } = view;
  const tone = view.closed ? WITHDRAWN_COLOR : color;
  const day = (value: string) => formatDate(value, "d MMMM yyyy", fmt);
  const month = formatDate(today, "MMMM", fmt);
  const progress = monthProgress(goal, today);
  const pc = goal.pace;

  const stats: Stat[] = (() => {
    const ok = "text-tint-green-ink";
    const warn = "text-warning";
    const first: Stat = view.closed
      ? { key: t("Status"), value: goal.reachedAt ? t("Achieved") : t("Closed early"), tone: ok, icon: Check, iconTone: "bg-success-soft" }
      : view.completed
        ? { key: t("Status"), value: t("Reached"), tone: ok, icon: Check, iconTone: "bg-success-soft" }
        : view.paused
          ? { key: t("Status"), value: t("Paused"), tone: "text-ink-soft", icon: Pause, iconTone: "bg-head-rule" }
          : pc?.state === "BEHIND"
            ? { key: t("Status"), value: t("{amount} behind", { amount: money(-Number(pc.difference)) }), tone: warn, icon: TriangleAlert, iconTone: "bg-warning-soft" }
            : pc?.state === "AHEAD"
              ? { key: t("Status"), value: t("{amount} ahead", { amount: money(pc.difference) }), tone: ok, icon: ArrowUpRight, iconTone: "bg-success-soft" }
              : { key: t("Status"), value: t("On pace"), tone: ok, icon: Check, iconTone: "bg-success-soft" };
    const second: Stat = view.closed
      ? { key: t("Sent to balance"), value: money(goal.withdrawnAmount), tone: "text-ink" }
      : view.completed
        ? { key: t("Reached on"), value: goal.reachedAt ? day(goal.reachedAt) : "–", tone: "text-ink" }
        : view.paused
          ? { key: t("Was due"), value: day(goal.targetDate), tone: "text-ink" }
          : { key: t("Needed a month"), value: money(progress.due), tone: "text-ink" };
    const third: Stat = view.closed
      ? { key: t("Date"), value: goal.lastWithdrawal ? day(goal.lastWithdrawal.date) : "–", tone: "text-ink" }
      : view.completed
        ? { key: t("Target"), value: money(view.target), tone: "text-ink" }
        : view.paused
          ? { key: t("Left to save"), value: money(Math.max(0, view.target - view.saved)), tone: "text-ink" }
          : progress.state === "done"
            ? { key: month, value: t("All done"), tone: ok, bar: { width: 100, tone: "bg-success", title: t("{month}: {amount} saved", { month, amount: money(progress.got) }) } }
            : progress.state === "part"
              ? {
                  key: month,
                  value: t("{amount} left", { amount: money(Math.max(0, progress.due - progress.got)) }),
                  tone: warn,
                  bar: { width: progress.percent, tone: "bg-warning-fill", title: t("{month}: {got} of {due}", { month, got: money(progress.got), due: money(progress.due) }) },
                }
              : { key: month, value: t("{amount} due", { amount: money(progress.due) }), tone: "text-ink", bar: { width: 0, tone: "bg-line", title: t("{month}: nothing yet · {amount} due", { month, amount: money(progress.due) }) } };
    return [first, second, third];
  })();

  const button = "flex h-10 shrink-0 items-center gap-1.75 rounded-[12px] px-4.5 text-[13px] font-semibold whitespace-nowrap text-white transition-opacity disabled:opacity-50 pointer-coarse:h-11 [&_svg]:size-3.75";
  const savedLabel = view.closed ? t("Taken out") : view.completed ? t("Saved in full") : t("Saved so far");

  return (
    <article
      aria-label={goal.name}
      className={cn(
        "relative flex min-w-0 flex-col rounded-[22px] border bg-surface shadow-[0_1px_2px_rgb(18_32_29/0.04),0_12px_30px_-10px_rgb(18_32_29/0.16)] transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgb(18_32_29/0.06),0_18px_40px_-10px_rgb(18_32_29/0.24)]",
        view.behind ? "border-warning-line" : view.completed ? "border-success-line" : "border-line-card",
      )}
    >
      <div
        className="relative flex flex-col gap-4 overflow-hidden rounded-t-[21px] px-5 py-4.5 text-white"
        style={{ background: view.paused ? `linear-gradient(135deg, ${shade(tone, -0.2)} 0%, ${shade(tone, 0.15)} 100%)` : deepBand(tone) }}
      >
        <span aria-hidden="true" className="pointer-events-none absolute -top-22.5 -right-17.5 size-60 rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.16)_0,transparent_68%)]" />
        <span aria-hidden="true" className="pointer-events-none absolute -right-11.5 -bottom-30 size-55 rounded-full border border-white/12" />
        <span aria-hidden="true" className="pointer-events-none absolute right-2.5 -bottom-37.5 size-55 rounded-full border border-white/8" />

        <div className="relative flex items-center gap-3">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-white/26 bg-white/16 text-[17px] font-bold shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]">
            {view.initial}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex min-w-0 items-center gap-2">
              <h3 className="min-w-0 truncate text-[16px] leading-[normal] font-bold tracking-[-0.005em]">{goal.name}</h3>
              {!view.active && <span className="shrink-0 rounded-full border border-white/28 bg-white/20 px-2 py-0.5 text-[11px] font-bold">{t(LOOK_META[view.look].label)}</span>}
            </span>
            <span className="truncate text-[12.5px] text-white/78">{view.when}</span>
          </span>
          {view.kept && (
            <span title={view.keptTitle} className="inline-flex max-w-37.5 min-w-0 items-center gap-1.25 rounded-full border border-white/20 bg-white/14 px-2.5 py-1 text-[11.5px] font-semibold max-sm:hidden">
              <Landmark className="size-3 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span className="truncate">{view.kept.name}</span>
            </span>
          )}
          <GoalMenu name={goal.name} items={view.menu} busy={busy} onAction={onAction} onColor />
        </div>

        <div className="relative flex items-end gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[11px] font-bold tracking-[0.08em] text-white/70 uppercase">{savedLabel}</span>
            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-[30px] leading-[1.1] font-bold tracking-[-0.02em] tabular-nums">{money(view.closed ? goal.withdrawnAmount : view.saved)}</span>
              <span className="text-[13px] text-white/75 tabular-nums">{t("of {amount}", { amount: money(view.target) })}</span>
            </span>
          </div>
          <div role="img" aria-label={t("{percent}% saved", { percent: formatCount(view.percent, fmt) })} className="relative size-16.5 shrink-0">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full mask-[radial-gradient(farthest-side,transparent_calc(100%-6px),#000_calc(100%-6px))]"
              style={{ background: `conic-gradient(white 0 ${view.percent}%, rgb(255 255 255 / 0.2) ${view.percent}% 100%)` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[15px] font-bold tabular-nums">{formatCount(view.percent, fmt)}%</span>
          </div>
        </div>

        <div className="relative flex flex-col gap-2">
          <div className="relative h-2 rounded-full bg-white/20" title={view.active ? t("The dark line shows where the plan expects you to be today.") : undefined}>
            <span className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-white/75 to-white shadow-[0_0_12px_rgb(255_255_255/0.35)]" style={{ width: `${view.percent}%` }} />
            {view.active && (
              <span aria-hidden="true" className="absolute -top-1 h-4 w-0.75 -translate-x-1/2 rounded-[2px] bg-white" style={{ left: `${view.timePercent}%`, boxShadow: `0 0 0 1.5px ${shade(tone, -0.45)}` }} />
            )}
          </div>
          <span className="flex justify-between gap-2 text-[12px] text-white/80 tabular-nums">
            <span>{view.leftText}</span>
            {view.active && pc && (
              <span className="flex items-center gap-1.25">
                <span aria-hidden="true" className="h-2.5 w-0.75 rounded-[2px] bg-white" />
                {t("Plan today {amount}", { amount: money(pc.expected) })}
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 px-4.5 py-4">
        <div
          className={cn(
            "grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)] rounded-[16px] border",
            view.behind ? "border-warning-line bg-warning-50" : view.completed ? "border-success-soft bg-gain-wash" : "border-head-rule bg-hover",
          )}
        >
          {stats.map((stat, index) => (
            <div key={index} className={cn("flex min-w-0 flex-col gap-1 px-3.5 py-3", index > 0 && (view.behind ? "border-l border-warning-line" : "border-l border-head-rule"))}>
              <span className="truncate text-[11px] font-bold tracking-[0.06em] text-ink-faint uppercase">{stat.key}</span>
              <span className="flex min-w-0 items-center gap-1.5">
                {stat.icon && (
                  <span aria-hidden="true" className={cn("flex size-4.5 shrink-0 items-center justify-center rounded-full", stat.iconTone, stat.tone)}>
                    <stat.icon className="size-2.75" strokeWidth={3} />
                  </span>
                )}
                <span className={cn("truncate text-[14px] font-bold tabular-nums", stat.tone)}>{stat.value}</span>
              </span>
              {stat.bar && (
                <span title={stat.bar.title} className="mt-0.5 block h-1 overflow-hidden rounded-full bg-line-card">
                  <span className={cn("block h-full rounded-full", stat.bar.tone)} style={{ width: `${stat.bar.width}%` }} />
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-2">
          {canManage && view.behind && (
            <button
              type="button"
              onClick={() => onAction("catch")}
              disabled={busy}
              className={button}
              style={{ background: `linear-gradient(135deg, ${shade("var(--warning-fill)", -0.12)} 0%, var(--warning) 100%)`, boxShadow: "0 6px 14px -6px color-mix(in srgb, var(--warning) 60%, transparent), inset 0 1px 0 rgb(255 255 255 / 0.18)" }}
            >
              <TrendingUp strokeWidth={2.5} aria-hidden="true" />
              {t("Catch up")}
            </button>
          )}
          {canManage && view.active && !noWallet && (
            <button
              type="button"
              onClick={() => onAction("add")}
              disabled={busy}
              className={cn(button, "px-4", view.behind && "border-[1.5px] bg-surface")}
              style={view.behind ? { borderColor: shade(tone, 0.55), color: shade(tone, -0.2) } : colorButton(tone)}
            >
              <Plus strokeWidth={2.5} aria-hidden="true" />
              {t("Add money")}
            </button>
          )}
          {canManage && view.active && noWallet && (
            <button type="button" onClick={() => onAction("wallet")} title={t("Add a savings account first")} className={cn(button, "gap-1.5 border border-line bg-strip px-3.5 text-ink-muted hover:border-input")}>
              <Lock strokeWidth={2.5} aria-hidden="true" />
              {t("Add an account first")}
            </button>
          )}
          {canManage && view.paused && (
            <button type="button" onClick={() => onAction("resume")} disabled={busy} className={button} style={colorButton(tone)}>
              <Play className="fill-current" strokeWidth={0} aria-hidden="true" />
              {t("Resume goal")}
            </button>
          )}
          {canManage && view.completed && view.saved > 0 && (
            <button
              type="button"
              onClick={() => onAction("withdraw")}
              disabled={busy}
              className={button}
              style={{ background: "linear-gradient(135deg, var(--success) 0%, var(--success-ink) 100%)", boxShadow: "0 6px 14px -6px color-mix(in srgb, var(--success-ink) 60%, transparent), inset 0 1px 0 rgb(255 255 255 / 0.18)" }}
            >
              <ArrowDown strokeWidth={2.5} aria-hidden="true" />
              {t("Withdraw to balance")}
            </button>
          )}
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => onAction("details")}
            className="flex h-10 items-center gap-2 rounded-[12px] pr-1.5 pl-3 text-[13px] font-semibold pointer-coarse:h-11"
            style={{ color: view.closed ? "var(--brand-ink)" : shade(tone, -0.18) }}
          >
            {t("Details")}
            <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full" style={{ background: shade(tone, 0.88) }}>
              <ArrowRight className="size-3.5" strokeWidth={2.5} />
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}

// The goal's letter on its colour (grey once withdrawn): the table row and
// the pickers.
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
