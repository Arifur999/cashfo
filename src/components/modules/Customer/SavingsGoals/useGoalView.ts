"use client";

import { ArrowDown, ArrowLeftRight, Check, CircleAlert, CirclePause, Info, Minus, Pause, Pencil, Play, Trash2, TrendingUp, TriangleAlert, type LucideIcon } from "lucide-react";
import type { SavingsGoal } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { keptIn } from "@/lib/customer/savingsDisplay";
import { dueThisMonth, goalLook, monthProgress, monthsToGo, timeFraction, type GoalLook } from "@/lib/customer/savingsPlan";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export type GoalAction = "details" | "catch" | "edit" | "pause" | "resume" | "move" | "withdraw" | "delete" | "add" | "wallet";

export interface GoalMenuItem {
  key: GoalAction;
  label: string;
  icon: LucideIcon;
  danger?: boolean;
  good?: boolean;
}

// Where a goal stands, by its look (the board's colours), and its icon.
const PACE_TONE: Record<GoalLook, { box: string; tile: string; head: string; icon: LucideIcon }> = {
  AHEAD: { box: "bg-success-soft text-success-ink", tile: "bg-success-soft text-success-ink", head: "text-success-ink", icon: TrendingUp },
  ON_TRACK: { box: "bg-emerald-soft text-brand-ink", tile: "bg-emerald-soft text-brand-ink", head: "text-brand-ink", icon: Check },
  BEHIND: { box: "bg-warning-soft text-warning-ink", tile: "bg-warning-soft text-warning-ink", head: "text-warning-ink", icon: TriangleAlert },
  PAUSED: { box: "bg-surface-sunken text-ink-soft", tile: "bg-surface-sunken text-ink-soft", head: "text-ink-soft", icon: CirclePause },
  COMPLETED: { box: "bg-success-soft text-success-ink", tile: "bg-success-soft text-success-ink", head: "text-success-ink", icon: Check },
  WITHDRAWN: { box: "bg-surface-sunken text-ink-muted", tile: "bg-surface-sunken text-ink-muted", head: "text-ink-muted", icon: Minus },
  ACHIEVED: { box: "bg-success-soft/60 text-success-ink", tile: "bg-success-soft text-success-ink", head: "text-success-ink", icon: Check },
};

interface GoalViewOptions {
  goal: SavingsGoal;
  color: string;
  currency: string;
  today: string;
  canManage: boolean;
  canMoveTo: boolean;
}

// Everything a goal's card and its table row show, worked out once: its
// look and how far along it is, the words for where it stands (long and
// short), this month's chip, the account it keeps its money in, and the
// menu of what can be done with it.
export function useGoalView({ goal, color, currency, today, canManage, canMoveTo }: GoalViewOptions) {
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
  const months = monthsToGo(goal.targetDate, today);

  const when = closed
    ? t("Withdrawn {date}", { date: withdrawnOn })
    : completed
      ? t("Reached · {start} → {end}", { start: day(goal.startDate), end: day(goal.targetDate) })
      : paused
        ? t("Paused · was due {date}", { date: day(goal.targetDate) })
        : t(months === 1 ? "{count} month left · by {date}" : "{count} months left · by {date}", { count: formatCount(months, fmt), date: day(goal.targetDate) });

  const pc = goal.pace;
  const pace = (() => {
    switch (look) {
      case "ACHIEVED":
        return { head: t("Achieved on {date}", { date: goal.reachedAt ? day(goal.reachedAt) : withdrawnOn }), text: t("{amount} sent to {account} on {date}.", { amount: money(goal.withdrawnAmount), account: withdrawnTo, date: withdrawnOn }), short: t("{amount} sent to balance", { amount: money(goal.withdrawnAmount) }) };
      case "WITHDRAWN":
        return { head: t("Closed early"), text: t("{amount} sent to {account} on {date}.", { amount: money(goal.withdrawnAmount), account: withdrawnTo, date: withdrawnOn }), short: t("{amount} sent to balance", { amount: money(goal.withdrawnAmount) }) };
      case "COMPLETED":
        return { head: t("Reached on {date}", { date: goal.reachedAt ? day(goal.reachedAt) : "" }), text: t("Withdraw it to your balance when you are ready to spend."), short: t("Ready to withdraw") };
      case "PAUSED":
        return { head: t("Paused"), text: t("No monthly target. Resume to start a fresh plan."), short: t("No monthly target") };
      case "BEHIND":
        return { head: t("{amount} behind", { amount: money(-Number(pc?.difference ?? 0)) }), text: t("Save {need} a month to finish on time.", { need: money(need) }), short: t("Save {amount} a month", { amount: money(need) }) };
      case "AHEAD":
        return { head: t("{amount} ahead", { amount: money(pc?.difference ?? 0) }), text: t("{need} a month is enough from here.", { need: money(need) }), short: t("{amount} a month is enough", { amount: money(need) }) };
      default:
        return { head: t("On pace"), text: t("Save {need} a month to stay on plan.", { need: money(need) }), short: t("Save {amount} a month", { amount: money(need) }) };
    }
  })();

  // This month's share on an active goal: done, part of it, or nothing yet.
  const chip = (() => {
    if (!active) return null;
    const progress = monthProgress(goal, today);
    if (progress.state === "done") return { text: `✓ ${t("{month} done", { month })}`, tone: "text-success-ink", row: "bg-success-soft text-success-ink" };
    if (progress.state === "part") return { text: t("{month} · {amount} left", { month, amount: money(Math.max(0, progress.due - progress.got)) }), tone: "text-warning-ink", row: "bg-warning-soft text-warning-ink" };
    return { text: t("{month} · {amount} due", { month, amount: money(progress.due) }), tone: "text-ink-soft", row: "bg-surface-sunken text-ink-soft" };
  })();

  const leftText = (active || paused) && left > 0 ? t("{amount} to go", { amount: money(left) }) : completed ? t("Full target saved") : closed ? t("Taken out of savings") : "";
  const kept = keptIn(goal);
  const keptTitle = kept ? `${closed ? t("Was kept in {name}", { name: kept.name }) : t("Kept in {name}", { name: kept.name })}${kept.number ? ` · ${kept.number}` : ""}` : "";
  const behind = look === "BEHIND";

  const canWithdraw = !closed && saved > 0;
  const menu: GoalMenuItem[] = [{ key: "details", label: t("Details"), icon: Info }];
  if (canManage) {
    if (behind) menu.push({ key: "catch", label: t("Catch up"), icon: TrendingUp });
    if (!closed) menu.push({ key: "edit", label: t("Edit goal"), icon: Pencil });
    if (active) menu.push({ key: "pause", label: t("Pause goal"), icon: Pause });
    if (paused) menu.push({ key: "resume", label: t("Resume goal"), icon: Play });
    if (canWithdraw && canMoveTo) menu.push({ key: "move", label: t("Move money"), icon: ArrowLeftRight });
    if (canWithdraw) menu.push(completed ? { key: "withdraw", label: t("Withdraw to balance"), icon: ArrowDown, good: true } : { key: "withdraw", label: t("Withdraw"), icon: ArrowDown, danger: true });
    if (goal.entryCount === 0) menu.push({ key: "delete", label: t("Delete goal"), icon: Trash2, danger: true });
  }

  return {
    look,
    active,
    paused,
    completed,
    closed,
    behind,
    saved,
    target,
    percent,
    timePercent,
    when,
    pace,
    tone: PACE_TONE[look],
    PaceIcon: look === "WITHDRAWN" ? CircleAlert : PACE_TONE[look].icon,
    chip,
    leftText,
    kept,
    keptTitle,
    menu,
    // The goal's colour; a withdrawn goal has none.
    tint: closed ? undefined : color,
    initial: (goal.name.trim().charAt(0) || "?").toUpperCase(),
    money,
  };
}
