"use client";

import { ArrowRight, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import type { SavingsGoal, SavingsGoalEntry } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { getSavingsGoalDetailAction } from "@/lib/customer/savingsGoalActions";
import { LOOK_META, TREND_META } from "@/lib/customer/savingsDisplay";
import { dueThisMonth, goalLook, monthlyAverage, monthsSinceStart, monthsToGo, planChart } from "@/lib/customer/savingsPlan";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { GoalAction } from "./GoalCard";
import { GoalRing } from "./GoalRing";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";

interface GoalDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  goal: SavingsGoal | null;
  color: string;
  currency: string;
  today: string;
  canManage: boolean;
  noWallet: boolean;
  canMoveTo: boolean;
  busy: boolean;
  onAction: (action: GoalAction | "statement") => void;
}

// One goal in full (design: SavingsDashboard's Details popup): how far it
// is, where it stands against its plan, six facts, the Saved against plan
// chart, and its history as a statement.
export function GoalDetailsDialog({ open, onClose, businessId, goal, color, currency, today, canManage, noWallet, canMoveTo, busy, onAction }: GoalDetailsDialogProps) {
  const { t, fmt } = useLocale();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const [entries, setEntries] = useState<{ goalId: string; key: string; list: SavingsGoalEntry[] } | null>(null);

  // The entries draw the chart and say when money last moved; they load
  // again when the goal changes under the popup.
  const loadKey = open && goal ? `${goal.id}|${goal.currentAmount}|${goal.status}|${goal.entryCount}` : null;
  useEffect(() => {
    if (!loadKey || !goal) return;
    let cancelled = false;
    getSavingsGoalDetailAction(businessId, goal.id)
      .then((result) => {
        if (!cancelled && result.success && result.data) setEntries({ goalId: goal.id, key: loadKey, list: result.data.entries });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [loadKey, businessId, goal]);

  if (!goal) return null;
  const list = entries?.goalId === goal.id ? entries.list : [];
  const look = goalLook(goal);
  const meta = LOOK_META[look];
  const active = goal.status === "ACTIVE";
  const paused = goal.status === "PAUSED";
  const completed = goal.status === "COMPLETED";
  const closed = goal.status === "WITHDRAWN";
  const saved = Number(goal.currentAmount);
  const target = Number(goal.targetAmount);
  const percent = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
  const day = (value: string) => formatDate(value, "d MMM yyyy", fmt);
  const months = monthsToGo(goal.targetDate, today);
  const since = monthsSinceStart(goal, today);
  const average = monthlyAverage(goal, today);
  const trend = active && goal.trend ? TREND_META[goal.trend] : null;
  const pace = goal.pace;
  const behind = look === "BEHIND";
  const need = dueThisMonth(goal, today);
  const chart = planChart(goal, list, today);
  const lastDay = list[0]?.date;

  const paceLine = (() => {
    if (closed) return { box: "bg-surface-sunken text-ink-2", head: look === "ACHIEVED" ? t("Achieved.") : t("Closed early."), text: t("{amount} went to {account} on {date}.", { amount: money(goal.withdrawnAmount), account: goal.lastWithdrawal?.accountName ?? t("your main balance"), date: goal.lastWithdrawal ? day(goal.lastWithdrawal.date) : "" }) };
    if (completed) return { box: "bg-income-soft text-income", head: t("Reached on {date}.", { date: goal.reachedAt ? day(goal.reachedAt) : "" }), text: t("The money is in your savings accounts. Withdraw it to your main balance when you are ready to spend.") };
    if (paused) return { box: "bg-surface-sunken text-ink-2", head: t("Paused."), text: t("No monthly target. Resuming starts a fresh plan from today.") };
    if (behind) return { box: "bg-warning-soft text-warning-ink", head: t("{amount} behind.", { amount: money(-Number(pace?.difference ?? 0)) }), text: t("You planned {expected} by today. Save {need} a month to still finish on time.", { expected: money(pace?.expected ?? 0), need: money(need) }) };
    if (look === "AHEAD") return { box: "bg-income-soft text-income", head: t("{amount} ahead.", { amount: money(pace?.difference ?? 0) }), text: t("More than planned for today. {need} a month is enough from here.", { need: money(need) }) };
    return { box: "bg-mint-50 text-brand-ink", head: t("On pace."), text: t("Save {need} a month to finish on {date}.", { need: money(need), date: day(goal.targetDate) }) };
  })();

  const stats = [
    { label: t("Started"), value: day(goal.startDate), sub: since ? t(since === 1 ? "{count} month ago" : "{count} months ago", { count: formatCount(since, fmt) }) : t("this month") },
    { label: t("Ends"), value: day(goal.targetDate), sub: closed ? t("closed early") : completed ? t("reached") : t(months === 1 ? "{count} month left" : "{count} months left", { count: formatCount(months, fmt) }) },
    { label: t("Left to save"), value: closed ? "—" : money(Math.max(0, target - saved)), sub: closed ? t("closed") : t("{percent}% done", { percent: formatCount(percent, fmt) }) },
    {
      label: t("Planned by today"),
      value: active && pace ? money(pace.expected) : "—",
      sub: active && pace ? (Number(pace.difference) >= 0 ? t("{amount} ahead", { amount: money(pace.difference) }) : t("{amount} behind", { amount: money(-Number(pace.difference)) })) : t("not tracking"),
      tone: active && pace ? (behind ? "text-warning" : "text-income") : undefined,
    },
    { label: t("Needed a month"), value: active ? money(need) : "—", sub: active ? t("to finish on time") : paused ? t("paused") : t("none") },
    { label: t("Your average"), value: average ? money(average) : "—", sub: trend ? t(trend.label) : t("a month so far"), tone: trend?.text },
  ];

  const canWithdraw = canManage && !closed && saved > 0;
  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      width={620}
      lead={<span aria-hidden="true" className="mt-2.5 size-2.5 shrink-0 rounded-full" style={{ background: closed ? "var(--ink-faint)" : color }} />}
      title={goal.name}
      aside={
        <Chip tone={meta.chip} size="sm" className="font-semibold">
          {t(meta.label)}
        </Chip>
      }
      actions={
        canManage &&
        !closed && (
          <button type="button" onClick={() => onAction("edit")} aria-label={t("Edit goal")} title={t("Edit goal")} className="-my-1 flex size-9 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-surface-sunken pointer-coarse:size-11">
            <Pencil className="size-4" aria-hidden="true" />
          </button>
        )
      }
      footerClassName="justify-start"
      footer={
        canManage && (
          <>
            {canWithdraw && (
              <Button variant="secondary" onClick={() => onAction("withdraw")} disabled={busy} className="border-expense-line px-3 text-[13px] text-expense hover:bg-expense-soft">
                {completed ? t("Withdraw to balance") : t("Withdraw")}
              </Button>
            )}
            {canWithdraw && canMoveTo && (
              <Button variant="secondary" onClick={() => onAction("move")} disabled={busy} className="px-3 text-[13px]">
                {t("Move money")}
              </Button>
            )}
            {(active || paused) && (
              <Button variant="secondary" onClick={() => onAction(paused ? "resume" : "pause")} disabled={busy} className="px-3 text-[13px]">
                {paused ? t("Resume") : t("Pause")}
              </Button>
            )}
            {goal.entryCount === 0 && (
              <Button variant="secondary" size="icon" onClick={() => onAction("delete")} disabled={busy} aria-label={t("Delete goal")} title={t("Delete goal")} className="text-ink-muted">
                <Trash2 className="size-3.75" />
              </Button>
            )}
            <span className="flex-1" />
            {active && behind && (
              <Button onClick={() => onAction("catch")} disabled={busy} className="bg-warning hover:bg-warning/90">
                {t("Catch up")}
              </Button>
            )}
            {active && !behind && (
              <Button onClick={() => onAction(noWallet ? "wallet" : "add")} disabled={busy}>
                <Plus strokeWidth={2.5} className="size-3.75" />
                {noWallet ? t("Add an account first") : t("Add money")}
              </Button>
            )}
          </>
        )
      }
    >
      <div className="flex items-center gap-5.5">
        <GoalRing percent={closed ? 0 : percent} color={closed ? "var(--line-strong)" : color} size={104} label={t("{percent}% saved", { percent: formatCount(percent, fmt) })}>
          <span className="text-[22px] leading-[normal] font-bold">{formatCount(closed ? 0 : percent, fmt)}%</span>
          <span className="text-[11px] font-normal text-ink-muted">{t("saved")}</span>
        </GoalRing>
        <div className="flex min-w-0 flex-1 flex-col gap-2 tabular-nums">
          <div className="flex flex-col gap-px">
            <span className="text-caption text-ink-muted">{closed ? t("Taken out") : t("Saved so far")}</span>
            <span className="text-small font-medium text-ink-muted">
              <span className="text-[22px] leading-[normal] font-bold text-ink">{money(closed ? goal.withdrawnAmount : saved)}</span> {t("of {amount}", { amount: money(target) })}
            </span>
          </div>
          <p className={cn("rounded-field px-2.5 py-2 text-[12.5px] leading-[1.45]", paceLine.box)}>
            <b className="font-semibold">{paceLine.head}</b> {paceLine.text}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex min-w-0 flex-col gap-0.5 rounded-md border border-line bg-strip px-3 py-2.5">
            <span className="text-caption text-ink-muted">{stat.label}</span>
            <span className={cn("text-body font-semibold text-ink tabular-nums", stat.tone)}>{stat.value}</span>
            <span className="text-[11.5px] text-ink-muted">{stat.sub}</span>
          </div>
        ))}
      </div>

      <section aria-label={t("Saved against plan")} className="flex flex-col gap-1.5 rounded-[14px] border border-line px-3.5 pt-3 pb-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[13.5px] font-semibold text-ink">{t("Saved against plan")}</h3>
          <span className="flex gap-3.5 text-[11.5px] text-ink-2">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="w-4 border-t-2 border-dashed border-ink-faint" />
              {t("Plan")}
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-0.75 w-4 rounded-xs" style={{ background: color }} />
              {t("Saved")}
            </span>
          </span>
        </div>
        <svg viewBox="0 0 540 150" className="h-auto w-full" role="img" aria-label={t("Saved {saved} against a plan of {expected} by today", { saved: money(saved), expected: money(pace?.expected ?? saved) })}>
          <line x1="64" y1="120" x2="530" y2="120" stroke="var(--line)" strokeWidth="1" />
          <line x1="64" y1="20" x2="530" y2="20" stroke="var(--divider)" strokeWidth="1" />
          <text x="60" y="24" textAnchor="end" fontSize="10" fill="var(--ink-faint)">
            {money(target)}
          </text>
          <text x="60" y="124" textAnchor="end" fontSize="10" fill="var(--ink-faint)">
            {formatCount(0, fmt)}
          </text>
          <line x1={chart.todayX} y1="14" x2={chart.todayX} y2="120" stroke="var(--line-strong)" strokeWidth="1" strokeDasharray="3 3" />
          <text x={chart.todayX} y="11" textAnchor="middle" fontSize="10" fill="var(--ink-2)">
            {t("Today")}
          </text>
          <polyline points={chart.planPoints} fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeDasharray="6 5" />
          <polyline points={chart.savedPoints} fill="none" stroke={color} strokeWidth="2.75" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={chart.now.x} cy={chart.now.y} r="4.5" fill={color} stroke="var(--surface)" strokeWidth="2" />
          <text x="64" y="140" fontSize="10" fill="var(--ink-muted)">
            {day(goal.startDate)}
          </text>
          <text x="530" y="140" textAnchor="end" fontSize="10" fill="var(--ink-muted)">
            {day(goal.targetDate)}
          </text>
        </svg>
      </section>

      {goal.description && <p className="rounded-field bg-strip px-3 py-2.5 text-small leading-normal text-ink-2">{goal.description}</p>}

      <section aria-label={t("History")} className="flex flex-wrap items-center gap-3 rounded-[14px] border border-line px-3.5 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-field bg-surface-sunken text-ink-2">
          <FileText className="size-4.25" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body font-semibold text-ink">{t("History")}</span>
          <span className="text-[12.5px] text-ink-muted">
            {goal.entryCount > 0
              ? `${t(goal.entryCount === 1 ? "{count} entry" : "{count} entries", { count: formatCount(goal.entryCount, fmt) })}${lastDay ? ` · ${t("last on {date}", { date: day(lastDay) })}` : ""}. ${t("From which account, into which savings account, and what is left.")}`
              : t("No money has moved for this goal yet.")}
          </span>
        </span>
        <Button variant="secondary" size="sm" onClick={() => onAction("statement")} className="pointer-coarse:h-11">
          {t("View statement")}
          <ArrowRight className="size-3.25" strokeWidth={2.5} />
        </Button>
      </section>
    </PopupDialog>
  );
}
