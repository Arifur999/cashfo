"use client";

import { ArrowDown, ArrowLeftRight, Check, ChevronRight, CircleAlert, CirclePause, Ellipsis, Info, Landmark, Lock, Minus, Pause, Pencil, Play, Plus, Trash2, TrendingUp, TriangleAlert } from "lucide-react";
import { iconActionClass } from "@/components/smartly/IconAction";
import Chip from "@/components/smartly/Chip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { SavingsGoal } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { keptIn, LOOK_META } from "@/lib/customer/savingsDisplay";
import { dueThisMonth, goalLook, monthProgress, monthsToGo, timeFraction, type GoalLook } from "@/lib/customer/savingsPlan";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export type GoalAction = "details" | "catch" | "edit" | "pause" | "resume" | "move" | "withdraw" | "delete" | "add" | "wallet";

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

const MENU_ITEM = "flex min-h-10 cursor-pointer items-center gap-2.5 rounded-sm px-2.5 text-small font-medium text-ink focus:bg-surface-sunken [&_svg]:size-3.75";

// The box that says where the goal stands, by its look (the board's colours).
export const PACE_TONE: Record<GoalLook, { box: string; icon: typeof Check }> = {
  AHEAD: { box: "bg-success-soft text-success-ink", icon: TrendingUp },
  ON_TRACK: { box: "bg-emerald-soft text-brand-ink", icon: Check },
  BEHIND: { box: "bg-warning-soft text-warning-ink", icon: TriangleAlert },
  PAUSED: { box: "bg-surface-sunken text-ink-soft", icon: CirclePause },
  COMPLETED: { box: "bg-success-soft text-success-ink", icon: Check },
  WITHDRAWN: { box: "bg-surface-sunken text-ink-muted", icon: Minus },
  ACHIEVED: { box: "bg-success-soft/60 text-success-ink", icon: Check },
};

// The month chip on an active goal: done, part of it, or nothing yet.
export function monthChip(goal: SavingsGoal, today: string, month: string, money: (value: number) => string, t: (key: string, values?: Record<string, string>) => string) {
  const progress = monthProgress(goal, today);
  if (progress.state === "done") return { text: `✓ ${t("{month} done", { month })}`, tone: "text-success-ink", row: "bg-success-soft text-success-ink" };
  if (progress.state === "part") return { text: t("{month} · {amount} left", { month, amount: money(Math.max(0, progress.due - progress.got)) }), tone: "text-warning-ink", row: "bg-warning-soft text-warning-ink" };
  return { text: t("{month} · {amount} due", { month, amount: money(progress.due) }), tone: "text-ink-soft", row: "bg-surface-sunken text-ink-soft" };
}

// One goal on the Savings goals page (SavingsDashboard board's card): its
// letter, how long it has left, how much of the target is saved against
// where the plan expects it today, the account it keeps its money in,
// where it stands with this month's share, and the next thing to do.
export function GoalCard({ goal, color, currency, today, canManage, noWallet, canMoveTo, busy, onAction }: GoalCardProps) {
  const { t, fmt } = useLocale();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const look = goalLook(goal);
  const active = goal.status === "ACTIVE";
  const paused = goal.status === "PAUSED";
  const completed = goal.status === "COMPLETED";
  const closed = goal.status === "WITHDRAWN";
  const saved = Number(goal.currentAmount);
  const target = Number(goal.targetAmount);
  const percent = closed ? 0 : Math.min(100, target > 0 ? Math.round((saved / target) * 100) : 0);
  const timePercent = Math.round(timeFraction(goal, today) * 100);
  const month = formatDate(today, "MMMM", fmt);
  const need = dueThisMonth(goal, today);
  const left = Math.max(0, target - saved);
  const day = (value: string) => formatDate(value, "d MMM yyyy", fmt);
  const withdrawnOn = goal.lastWithdrawal ? day(goal.lastWithdrawal.date) : "";
  const withdrawnTo = goal.lastWithdrawal?.accountName ?? t("your main balance");
  const kept = keptIn(goal);
  const tint = closed ? undefined : color;

  const months = monthsToGo(goal.targetDate, today);
  const when = closed
    ? t("Withdrawn {date}", { date: withdrawnOn })
    : completed
      ? t("Reached · {start} → {end}", { start: day(goal.startDate), end: day(goal.targetDate) })
      : paused
        ? t("Paused · was due {date}", { date: day(goal.targetDate) })
        : t(months === 1 ? "{count} month left · by {date}" : "{count} months left · by {date}", { count: formatCount(months, fmt), date: day(goal.targetDate) });

  const pace = (() => {
    const pc = goal.pace;
    switch (look) {
      case "ACHIEVED":
        return { head: t("Achieved on {date}", { date: goal.reachedAt ? day(goal.reachedAt) : withdrawnOn }), text: t("{amount} sent to {account} on {date}.", { amount: money(goal.withdrawnAmount), account: withdrawnTo, date: withdrawnOn }) };
      case "WITHDRAWN":
        return { head: t("Closed early"), text: t("{amount} sent to {account} on {date}.", { amount: money(goal.withdrawnAmount), account: withdrawnTo, date: withdrawnOn }) };
      case "COMPLETED":
        return { head: t("Reached on {date}", { date: goal.reachedAt ? day(goal.reachedAt) : "" }), text: t("Withdraw it to your balance when you are ready to spend.") };
      case "PAUSED":
        return { head: t("Paused"), text: t("No monthly target. Resume to start a fresh plan.") };
      case "BEHIND":
        return { head: t("{amount} behind", { amount: money(-Number(pc?.difference ?? 0)) }), text: t("Save {need} a month to finish on time.", { need: money(need) }) };
      case "AHEAD":
        return { head: t("{amount} ahead", { amount: money(pc?.difference ?? 0) }), text: t("{need} a month is enough from here.", { need: money(need) }) };
      default:
        return { head: t("On pace"), text: t("Save {need} a month to stay on plan.", { need: money(need) }) };
    }
  })();
  const tone = PACE_TONE[look];
  const PaceIcon = tone.icon;
  const chip = active ? monthChip(goal, today, month, money, t) : null;
  const leftText = (active || paused) && left > 0 ? t("{amount} to go", { amount: money(left) }) : completed ? t("Full target saved") : closed ? t("Taken out of savings") : "";

  const behind = look === "BEHIND";
  const canWithdraw = !closed && saved > 0;
  const menu: { key: GoalAction; label: string; icon: typeof Check; danger?: boolean; good?: boolean }[] = [{ key: "details", label: t("Details"), icon: Info }];
  if (canManage) {
    if (behind) menu.push({ key: "catch", label: t("Catch up"), icon: TrendingUp });
    if (!closed) menu.push({ key: "edit", label: t("Edit goal"), icon: Pencil });
    if (active) menu.push({ key: "pause", label: t("Pause goal"), icon: Pause });
    if (paused) menu.push({ key: "resume", label: t("Resume goal"), icon: Play });
    if (canWithdraw && canMoveTo) menu.push({ key: "move", label: t("Move money"), icon: ArrowLeftRight });
    if (canWithdraw) menu.push(completed ? { key: "withdraw", label: t("Withdraw to balance"), icon: ArrowDown, good: true } : { key: "withdraw", label: t("Withdraw"), icon: ArrowDown, danger: true });
    if (goal.entryCount === 0) menu.push({ key: "delete", label: t("Delete goal"), icon: Trash2, danger: true });
  }
  const pill = "flex h-9.5 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap transition-opacity disabled:opacity-50 pointer-coarse:h-11 [&_svg]:size-3.5";

  return (
    <article
      aria-label={goal.name}
      className={cn("flex min-w-0 flex-col gap-4 rounded-[20px] border p-5 shadow-card", behind ? "border-warning-line bg-surface" : completed ? "border-success-line bg-success-soft/30" : "border-line-card bg-surface")}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-[17px] font-bold", closed && "bg-surface-sunken text-ink-faint")}
          style={tint ? { background: `color-mix(in srgb, ${tint} 14%, var(--surface))`, color: tint } : undefined}
        >
          {(goal.name.trim().charAt(0) || "?").toUpperCase()}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="flex min-w-0 items-center gap-2">
            <h3 className={cn("min-w-0 truncate text-[16px] leading-[1.3] font-bold", closed ? "text-ink-muted" : "text-ink")}>{goal.name}</h3>
            {!active && (
              <Chip tone={LOOK_META[look].chip} size="sm" className="shrink-0 px-2 text-[11px] font-bold">
                {t(LOOK_META[look].label)}
              </Chip>
            )}
          </span>
          <span className="truncate text-[12.5px] text-ink-muted">{when}</span>
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={t("Actions for {name}", { name: goal.name })} disabled={busy} className={cn(iconActionClass(), "data-open:border-mint-200 data-open:bg-emerald-soft data-open:text-emerald")}>
            <Ellipsis aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="w-57.5 rounded-[14px] border border-line bg-surface p-1.5 shadow-overlay ring-0">
            {menu.map((item, index) => (
              <div key={item.key}>
                {item.key === "delete" && index > 0 && <DropdownMenuSeparator className="my-1 bg-line" />}
                <DropdownMenuItem onSelect={() => onAction(item.key)} className={cn(MENU_ITEM, item.danger && "text-expense focus:bg-expense-soft focus:text-expense", item.good && "text-success-ink focus:text-success-ink")}>
                  <item.icon aria-hidden="true" />
                  {item.label}
                </DropdownMenuItem>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-4.5">
        <div
          role="img"
          aria-label={t("{percent}% saved", { percent: formatCount(percent, fmt) })}
          className="flex size-19 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(${tint ?? "var(--input)"} 0 ${percent}%, var(--surface-sunken) ${percent}% 100%)` }}
        >
          <span className={cn("flex size-15 items-center justify-center rounded-full text-[16px] font-bold tabular-nums", completed ? "bg-success-soft text-ink" : "bg-surface text-ink", closed && "text-ink-faint")}>
            {formatCount(percent, fmt)}%
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[24px] leading-[normal] font-bold tracking-[-0.01em] text-ink tabular-nums">{money(closed ? goal.withdrawnAmount : saved)}</span>
            <span className="text-[13px] text-ink-muted tabular-nums">{t("of {amount}", { amount: money(target) })}</span>
            <span className="flex-1" />
            {kept && (
              <span title={`${closed ? t("Was kept in {name}", { name: kept.name }) : t("Kept in {name}", { name: kept.name })}${kept.number ? ` · ${kept.number}` : ""}`} className="inline-flex max-w-42.5 items-center gap-1.25 rounded-full bg-surface-sunken px-2.25 py-0.75 text-[11.5px] font-semibold text-ink-2">
                <Landmark className="size-3 shrink-0 text-ink-soft" strokeWidth={2} aria-hidden="true" />
                <span className="truncate">{kept.name}</span>
              </span>
            )}
          </span>
          {active ? (
            <>
              <div className="relative h-2.5 rounded-full bg-surface-sunken" title={t("The dark line shows where the plan expects you to be today.")}>
                <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${percent}%`, background: tint }} />
                <span aria-hidden="true" className="absolute -top-1 h-4.5 w-0.75 -translate-x-1/2 rounded-xs bg-ink" style={{ left: `${timePercent}%` }} />
              </div>
              <span className="flex justify-between gap-2 text-[12px] text-ink-muted tabular-nums">
                <span>{leftText}</span>
                {goal.pace && (
                  <span className="flex items-center gap-1.25">
                    <span aria-hidden="true" className="h-2.5 w-0.75 rounded-xs bg-ink" />
                    {t("Plan today {amount}", { amount: money(goal.pace.expected) })}
                  </span>
                )}
              </span>
            </>
          ) : (
            leftText && <span className="text-[12.5px] text-ink-muted">{leftText}</span>
          )}
        </div>
      </div>

      <div className={cn("flex items-center gap-3 rounded-[14px] px-3.5 py-3", tone.box)}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-surface/70">
          {look === "WITHDRAWN" ? <CircleAlert className="size-4" strokeWidth={2.25} aria-hidden="true" /> : <PaceIcon className="size-4" strokeWidth={2.25} aria-hidden="true" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="text-[14px] font-bold tabular-nums">{pace.head}</span>
          <span className="text-[12.5px] opacity-90">{pace.text}</span>
        </span>
        {chip && <span className={cn("shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11.5px] font-bold whitespace-nowrap tabular-nums", chip.tone)}>{chip.text}</span>}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {canManage && behind && (
          <button type="button" onClick={() => onAction("catch")} disabled={busy} className={cn(pill, "bg-warning px-4 text-white hover:opacity-90")}>
            <TrendingUp strokeWidth={2.5} aria-hidden="true" />
            {t("Catch up")}
          </button>
        )}
        {canManage && active && !noWallet && (
          <button type="button" onClick={() => onAction("add")} disabled={busy} className={cn(pill, "bg-emerald-soft text-emerald hover:bg-mint-50")}>
            <Plus strokeWidth={2.5} aria-hidden="true" />
            {t("Add money")}
          </button>
        )}
        {canManage && active && noWallet && (
          <button type="button" onClick={() => onAction("wallet")} title={t("Add a savings account first")} className={cn(pill, "border border-line bg-strip px-3 text-ink-muted hover:border-input")}>
            <Lock strokeWidth={2.5} aria-hidden="true" />
            {t("Add an account first")}
          </button>
        )}
        {canManage && paused && (
          <button type="button" onClick={() => onAction("resume")} disabled={busy} className={cn(pill, "bg-emerald text-white hover:bg-emerald-hover")}>
            <Play className="fill-current" strokeWidth={0} aria-hidden="true" />
            {t("Resume goal")}
          </button>
        )}
        {canManage && completed && saved > 0 && (
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
