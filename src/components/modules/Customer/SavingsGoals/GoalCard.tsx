"use client";

import { ArrowDown, ArrowLeftRight, CalendarDays, Check, CircleAlert, Ellipsis, Info, Lock, Pause, Pencil, Play, Plus, Trash2, TrendingUp, TriangleAlert } from "lucide-react";
import Chip from "@/components/smartly/Chip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { SavingsGoal } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { LOOK_META } from "@/lib/customer/savingsDisplay";
import { dueThisMonth, goalLook, monthProgress, monthsToGo, timeFraction, type GoalLook } from "@/lib/customer/savingsPlan";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
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

// The box under the bars that says where the goal stands, by its look.
const PACE_TONE: Record<GoalLook, { box: string; icon: typeof Check }> = {
  AHEAD: { box: "bg-income-soft text-income", icon: TrendingUp },
  ON_TRACK: { box: "bg-mint-50 text-brand-ink", icon: Check },
  BEHIND: { box: "bg-warning-soft text-warning-ink", icon: TriangleAlert },
  PAUSED: { box: "bg-surface-sunken text-ink-2", icon: Pause },
  COMPLETED: { box: "bg-income-soft text-income", icon: Check },
  WITHDRAWN: { box: "bg-surface-sunken text-ink-muted", icon: Info },
  ACHIEVED: { box: "bg-income-soft text-income", icon: Check },
};

// One goal on the Savings goals page (design: SavingsDashboard's cards):
// what is saved of the target, how far through its money and its time it
// is, this month's progress, where it stands against its plan, and the
// next thing to do.
export function GoalCard({ goal, color, currency, today, canManage, noWallet, canMoveTo, busy, onAction }: GoalCardProps) {
  const { t, fmt } = useLocale();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const look = goalLook(goal);
  const meta = LOOK_META[look];
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
    ? t("Started {start} · withdrawn {date}", { start: day(goal.startDate), date: withdrawnOn })
    : `${day(goal.startDate)} → ${day(goal.targetDate)} · ${completed ? t("reached") : paused ? t("paused") : t(months === 1 ? "{count} month left" : "{count} months left", { count: formatCount(months, fmt) })}`;

  const pace = (() => {
    const pc = goal.pace;
    switch (look) {
      case "ACHIEVED":
        return { head: t("Achieved on {date}.", { date: goal.reachedAt ? day(goal.reachedAt) : withdrawnOn }), text: t("{amount} went to {account} on {date}.", { amount: money(goal.withdrawnAmount), account: withdrawnTo, date: withdrawnOn }) };
      case "WITHDRAWN":
        return { head: t("Closed early."), text: t("{amount} went to {account} on {date}.", { amount: money(goal.withdrawnAmount), account: withdrawnTo, date: withdrawnOn }) };
      case "COMPLETED":
        return { head: t("Reached on {date}.", { date: goal.reachedAt ? day(goal.reachedAt) : "" }), text: t("The money is in your savings accounts. Withdraw it to your main balance when you are ready to spend.") };
      case "PAUSED":
        return { head: t("Paused."), text: t("No monthly target. Resuming starts a fresh plan from today.") };
      case "BEHIND":
        return { head: t("{amount} behind.", { amount: money(-Number(pc?.difference ?? 0)) }), text: t("You planned {expected} by today. Save {need} a month to still finish on time.", { expected: money(pc?.expected ?? 0), need: money(need) }) };
      case "AHEAD":
        return { head: t("{amount} ahead.", { amount: money(pc?.difference ?? 0) }), text: t("More than planned for today. {need} a month is enough from here.", { need: money(need) }) };
      default:
        return { head: t("On pace."), text: t("Save {need} a month to finish on {date}.", { need: money(need), date: day(goal.targetDate) }) };
    }
  })();
  const tone = PACE_TONE[look];
  const PaceIcon = look === "WITHDRAWN" ? CircleAlert : tone.icon;

  const progress = active ? monthProgress(goal, today) : null;
  const monthLine = progress
    ? progress.state === "done"
      ? { text: `✓ ${t("{month}: {amount} saved", { month, amount: money(progress.got) })}`, chip: "bg-income-soft text-income", bar: "bg-income", width: 100 }
      : progress.state === "part"
        ? { text: t("{month}: {got} of {due}", { month, got: money(progress.got), due: money(progress.due) }), chip: "bg-warning-soft text-warning-ink", bar: "bg-warning", width: progress.percent }
        : { text: t("{month}: nothing yet · {due} due", { month, due: money(progress.due) }), chip: "bg-surface-sunken text-ink-2", bar: "bg-line-strong", width: 0 }
    : null;

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

  return (
    <article
      aria-label={goal.name}
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-lg border bg-surface p-5 shadow-card",
        behind ? "border-warning-line" : completed ? "border-income/45 bg-income-soft/30" : "border-line",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: closed ? "var(--line-strong)" : color }} />
        <h3 className={cn("min-w-0 truncate text-[16px] leading-[1.3] font-semibold", closed ? "text-ink-muted" : "text-ink")}>{goal.name}</h3>
        <Chip tone={meta.chip} size="sm" className="shrink-0 font-semibold">
          {t(meta.label)}
        </Chip>
        <span className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={t("Actions for {name}", { name: goal.name })} disabled={busy} className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11">
            <Ellipsis className="size-4.5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="w-57.5 rounded-[14px] border border-line bg-surface p-1.5 shadow-overlay ring-0">
            {menu.map((item, index) => (
              <div key={item.key}>
                {item.key === "delete" && index > 0 && <DropdownMenuSeparator className="my-1 bg-line" />}
                <DropdownMenuItem onSelect={() => onAction(item.key)} className={cn(MENU_ITEM, item.danger && "text-expense focus:bg-expense-soft focus:text-expense", item.good && "text-income focus:text-income")}>
                  <item.icon aria-hidden="true" />
                  {item.label}
                </DropdownMenuItem>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* One sentence, so Bangla can put the target first. */}
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 tabular-nums">
        <span className="text-small font-medium text-ink-muted">
          {fillNodes(t("{saved} of {target}"), {
            saved: <span className="text-[22px] leading-[normal] font-bold tracking-[-0.01em] text-ink">{money(closed ? goal.withdrawnAmount : saved)}</span>,
            target: money(target),
          })}
        </span>
        {(active || paused) && left > 0 && <span className="text-small font-semibold text-ink-2">· {t("{amount} to go", { amount: money(left) })}</span>}
      </div>

      <div className="flex flex-col gap-2 text-caption">
        <Bar label={t("Saved")} width={percent} fill={closed ? undefined : color} text={t("{percent}% saved", { percent: formatCount(percent, fmt) })} />
        <Bar label={t("Time")} width={timePercent} fill="var(--ink-faint)" text={t("{percent}% of time", { percent: formatCount(timePercent, fmt) })} />
      </div>

      <p className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
        <CalendarDays className="size-3.25 shrink-0 text-ink-muted" aria-hidden="true" />
        {when}
      </p>

      {monthLine && (
        <div className="flex items-center gap-2.5">
          <span className={cn("shrink-0 rounded-full px-2.5 py-0.75 text-caption font-semibold tabular-nums", monthLine.chip)}>{monthLine.text}</span>
          <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
            <span className={cn("block h-full rounded-full", monthLine.bar)} style={{ width: `${Math.min(100, monthLine.width)}%` }} />
          </span>
        </div>
      )}

      <p className={cn("flex items-start gap-2 rounded-field px-3 py-2.25 text-[12.5px] leading-[1.45]", tone.box)}>
        <PaceIcon className="mt-px size-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
        <span>
          <b className="font-semibold">{pace.head}</b> {pace.text}
        </span>
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {canManage && behind && (
          <button type="button" onClick={() => onAction("catch")} disabled={busy} className="h-9 rounded-full bg-warning px-3.5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50 pointer-coarse:h-11">
            {t("Catch up")}
          </button>
        )}
        {canManage && active && !noWallet && (
          <button type="button" onClick={() => onAction("add")} disabled={busy} className="flex h-9 items-center gap-1.5 rounded-full bg-mint-50 px-3 text-[13px] font-semibold text-brand-ink hover:bg-mint-200 disabled:opacity-50 pointer-coarse:h-11">
            <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
            {t("Add money")}
          </button>
        )}
        {canManage && active && noWallet && (
          <button type="button" onClick={() => onAction("wallet")} title={t("Add a savings account first")} className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-strip px-3 text-[13px] font-semibold text-ink-muted hover:border-line-strong pointer-coarse:h-11">
            <Lock className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
            {t("Add an account first")}
          </button>
        )}
        {canManage && paused && (
          <button type="button" onClick={() => onAction("resume")} disabled={busy} className="h-9 rounded-full border border-input bg-surface px-3 text-[13px] font-semibold text-ink hover:bg-surface-sunken disabled:opacity-50 pointer-coarse:h-11">
            {t("Resume goal")}
          </button>
        )}
        {canManage && completed && saved > 0 && (
          <button type="button" onClick={() => onAction("withdraw")} disabled={busy} className="flex h-9 items-center gap-1.5 rounded-full bg-income px-3.5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50 pointer-coarse:h-11">
            <ArrowDown className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
            {t("Withdraw to balance")}
          </button>
        )}
        <button type="button" onClick={() => onAction("details")} className="h-9 px-1.5 text-[13px] font-semibold text-emerald hover:text-emerald-hover pointer-coarse:h-11">
          {t("Details")}
        </button>
      </div>
    </article>
  );
}

// "Saved ▬▬▬ 53% saved": a label, a thin bar and its figure.
function Bar({ label, width, fill, text }: { label: string; width: number; fill?: string; text: string }) {
  return (
    <div className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-2.5">
      <span className="font-medium text-ink-muted">{label}</span>
      <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-surface-sunken">
        <span className="block h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, width))}%`, background: fill ?? "transparent" }} />
      </span>
      <span className="min-w-24 text-right font-semibold text-ink tabular-nums">{text}</span>
    </div>
  );
}
