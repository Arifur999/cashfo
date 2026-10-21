"use client";

import { ArrowLeftRight, Minus, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import LoadMore from "@/components/smartly/LoadMore";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { SavingsGoal, SavingsGoalDetail, SavingsGoalEntry } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { getSavingsGoalDetailAction } from "@/lib/customer/savingsGoalActions";
import { ENTRY_META, goalBadge, goalColor, neededPerMonth, remainingOf, ringPercent, timeLeft, timeLeftText, TREND_META } from "@/lib/customer/savingsDisplay";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GoalRing } from "./GoalRing";

interface GoalDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  // Read from the page's list on every render, so a Pause or a refresh shows
  // here at once.
  goal: SavingsGoal | null;
  goalIndex: number;
  currency: string;
  today: string;
  canManage: boolean;
  // Whether money can be added right now (a savings wallet exists).
  canAddMoney: boolean;
  // A Pause or Resume is on its way: pressing again would send it twice.
  busy?: boolean;
  onEdit: (goal: SavingsGoal) => void;
  onAddMoney: (goal: SavingsGoal) => void;
  onWithdraw: (goal: SavingsGoal) => void;
  onTogglePause: (goal: SavingsGoal) => void;
  onDelete: (goal: SavingsGoal) => void;
}

const ENTRY_ICON = { CONTRIBUTION: Plus, TRANSFER_IN: ArrowLeftRight, TRANSFER_OUT: ArrowLeftRight, WITHDRAWAL: Minus } as const;
const ENTRY_TILE = { income: "bg-mint-50 text-emerald", info: "bg-info-soft text-info", expense: "bg-expense-soft text-expense" } as const;

// History rows shown at first, and added by each "Show more".
const HISTORY_STEP = 20;

interface HistoryState {
  // The load this answers: the goal, its status and amount, the attempt.
  key: string;
  goalId: string;
  // The last history that loaded for this goal, kept on screen while a newer
  // one loads (after a Pause, say) or if that one fails.
  detail: SavingsGoalDetail | null;
  failed: boolean;
}

interface FactProps {
  label: string;
  value: string;
  sub: string;
  className?: string;
}

// One goal in full: how far along it is, when and how much a month, how it
// has been going lately, and everything that moved in or out of it.
export function GoalDetailDrawer({ open, onClose, businessId, goal, goalIndex, currency, today, canManage, canAddMoney, busy = false, onEdit, onAddMoney, onWithdraw, onTogglePause, onDelete }: GoalDetailDrawerProps) {
  const { t, locale } = useLocale();
  const wide = useMediaQuery("(min-width: 768px)");
  const historyId = useId();
  const deleteReasonId = useId();
  const addReasonId = useId();
  const [history, setHistory] = useState<HistoryState | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [visible, setVisible] = useState(HISTORY_STEP);

  // Each opening loads afresh and starts from the newest rows.
  const openId = open && goal ? goal.id : null;
  const [prevOpenId, setPrevOpenId] = useState<string | null>(null);
  if (openId !== prevOpenId) {
    setPrevOpenId(openId);
    if (openId) {
      setAttempt((count) => count + 1);
      setVisible(HISTORY_STEP);
    }
  }

  // The goal changing under the drawer (paused, money added) loads its
  // history again. A reply for an earlier key -- another goal opened since,
  // or the drawer closed -- is dropped, never shown for this one.
  const loadKey = openId && goal ? `${openId}|${goal.status}|${goal.currentAmount}|${attempt}` : null;
  useEffect(() => {
    if (!loadKey || !openId) return;
    let cancelled = false;
    const settle = (loaded: SavingsGoalDetail | null) => {
      if (cancelled) return;
      setHistory((previous) => ({ key: loadKey, goalId: openId, detail: loaded ?? (previous?.goalId === openId ? previous.detail : null), failed: loaded === null }));
    };
    getSavingsGoalDetailAction(businessId, openId)
      .then((result) => settle(result.success ? (result.data ?? null) : null))
      .catch(() => settle(null));
    return () => {
      cancelled = true;
    };
  }, [loadKey, openId, businessId]);

  if (!goal) return null;
  const mine = history?.goalId === goal.id ? history : null;
  const detail = mine?.detail ?? null;
  const failed = !detail && mine?.key === loadKey && mine.failed;
  const entries = detail?.entries ?? [];

  const badge = goalBadge(goal);
  const active = goal.status === "ACTIVE";
  const paused = goal.status === "PAUSED";
  const completed = goal.status === "COMPLETED";
  const closed = goal.status === "WITHDRAWN";
  const saved = Number(goal.currentAmount);
  const percent = ringPercent(goal);
  const trend = goal.trend ? TREND_META[goal.trend] : null;
  const left = timeLeft(goal.targetDate, today);
  const leftLabel = timeLeftText(goal.targetDate, today, t, locale);
  // Newest first, so the first one is the payout.
  const payout = entries.find((entry) => entry.type === "WITHDRAWAL");
  const bold = (text: string) => <b className="font-semibold text-ink">{text}</b>;

  // Only what is true of the goal as it stands: a finished or paid-out goal
  // has no months left and no monthly amount to keep up.
  const facts: FactProps[] = [{ label: t("Reach by"), value: formatDate(goal.targetDate, "MMM yyyy"), sub: paused ? t("paused") : closed ? t("Paid out") : completed ? t("Reached") : leftLabel }];
  if (active || paused) facts.push({ label: t("Monthly target"), value: paused ? "—" : formatCurrency(goal.monthlyTarget, currency), sub: paused ? t("while paused") : t("as planned") });
  if (active) facts.push({ label: t("Lately"), value: trend ? t(trend.short) : "—", sub: trend ? t("than before") : t("too early to say"), className: trend?.text });

  // The plan's monthly figure is an even pace from the start; this is what
  // finishing on time takes from today, given what is saved already.
  const toGo = remainingOf(goal);
  const neededNote =
    active && toGo > 0
      ? left.kind === "past"
        ? fillNodes(t("Its date has passed, with {amount} still to go."), { amount: bold(formatCurrency(toGo, currency)) })
        : fillNodes(t("To finish on time, save {amount} a month from now."), { amount: bold(formatCurrency(Math.ceil(neededPerMonth(goal, today)), currency)) })
      : null;

  // The backend deletes only a goal nothing was ever added to or moved out
  // of, so Delete is offered on an empty goal, and explained once its
  // history shows it can't be.
  const deletable = !closed && !completed && saved <= 0;
  const hasHistory = entries.length > 0;
  const deleteReason = deletable && hasHistory ? (paused ? t("Goals with history can't be deleted.") : t("Goals with history can't be deleted. Pause it instead.")) : null;
  const addReason = closed ? null : paused ? (
    t("Resume the goal to add money")
  ) : !canAddMoney ? (
    <Link href="/savings-goals/wallet?add=1" onNavigate={onClose} className="font-semibold text-emerald hover:underline">
      {t("Add a savings wallet first")}
    </Link>
  ) : null;

  const entryLine = (entry: SavingsGoalEntry) => {
    const route = entry.type === "WITHDRAWAL" ? entry.savingsAccountName : [entry.moneyAccountName, entry.savingsAccountName].filter(Boolean).join(" → ");
    return [formatDate(entry.date), route || (entry.relatedGoalName ? t("goal transfer") : null)].filter(Boolean).join(" · ");
  };

  const entryRow = (entry: SavingsGoalEntry) => {
    const meta = ENTRY_META[entry.type];
    const Icon = ENTRY_ICON[entry.type];
    const title = entry.relatedGoalName && meta.withGoal ? t(meta.withGoal, { goal: entry.relatedGoalName }) : t(meta.title);
    return (
      <li key={entry.id} className="flex items-center gap-3 border-b border-divider py-3">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", ENTRY_TILE[meta.tone])}>
          <Icon className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="truncate text-small font-medium text-ink">{title}</span>
          <span className="truncate text-caption font-normal text-ink-muted">{entryLine(entry)}</span>
          {/* The note typed with the money ("October deposit"). */}
          {entry.notes && (
            <span title={entry.notes} className="truncate text-caption font-normal text-ink-muted">
              {entry.notes}
            </span>
          )}
        </span>
        <span className={cn("shrink-0 text-body font-semibold tabular-nums", meta.tone === "income" ? "text-income" : meta.tone === "info" ? "text-info" : "text-expense")}>
          {meta.flow === "in" ? "+" : "−"} {formatCurrency(entry.amount, currency)}
        </span>
      </li>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-120 shadow-drawer data-[side=right]:sm:max-w-120" : "rounded-t-xl data-[side=bottom]:h-[92vh]")}
      >
        <SheetHeader className={cn("flex-row items-center gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <SheetTitle className="truncate text-h3 text-ink">{goal.name}</SheetTitle>
          <Chip tone={badge.chip} size="sm" className="font-semibold">
            {t(badge.label)}
          </Chip>
          <span className="flex-1" />
          {canManage && !closed && (
            <button type="button" onClick={() => onEdit(goal)} aria-label={t("Edit goal")} title={t("Edit goal")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-2 hover:bg-surface-sunken pointer-coarse:size-11">
              <Pencil className="size-4" aria-hidden="true" />
            </button>
          )}
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken pointer-coarse:size-11">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <div className={cn("flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
          <div className="flex items-center gap-6">
            <GoalRing
              percent={percent}
              color={goalColor(goalIndex, goal.status)}
              size={128}
              label={closed ? t("Withdrawn {amount}", { amount: formatCurrency(goal.withdrawnAmount, currency) }) : t("{percent}% saved", { percent })}
            >
              <span className="text-h1">{closed && percent >= 100 ? "✓" : `${percent}%`}</span>
              <span className="text-caption font-normal text-ink-muted">{closed ? t("withdrawn") : t("saved")}</span>
            </GoalRing>
            <div className="flex flex-col gap-3 tabular-nums">
              <div className="flex flex-col gap-px">
                <span className="text-caption font-normal text-ink-muted">{closed ? t("Withdrawn") : t("Saved")}</span>
                <span className="text-h2 text-ink">{formatCurrency(closed ? goal.withdrawnAmount : goal.currentAmount, currency)}</span>
              </div>
              <div className="flex gap-5">
                <div className="flex flex-col gap-px">
                  <span className="text-caption font-normal text-ink-muted">{t("Target")}</span>
                  <span className="text-body font-semibold text-ink">{formatCurrency(goal.targetAmount, currency)}</span>
                </div>
                {closed ? (
                  <div className="flex flex-col gap-px">
                    <span className="text-caption font-normal text-ink-muted">{t("Withdrawn on")}</span>
                    <span className="text-body font-semibold text-ink">{payout ? formatDate(payout.date) : "—"}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-px">
                    <span className="text-caption font-normal text-ink-muted">{t("To go")}</span>
                    <span className="text-body font-semibold text-ink">{formatCurrency(toGo, currency)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={cn("grid gap-2", facts.length === 3 ? "grid-cols-3" : facts.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
            {facts.map((fact) => (
              <Fact key={fact.label} {...fact} />
            ))}
          </div>

          {neededNote && <p className="rounded-md border border-line bg-strip px-3 py-2.5 text-small text-ink-2">{neededNote}</p>}

          {goal.description && <p className="text-body text-ink-2">{goal.description}</p>}

          <section className="flex flex-col">
            <h3 id={`${historyId}-title`} className="mb-3 text-body font-semibold text-ink">
              {t("History")}
            </h3>
            {detail ? (
              entries.length === 0 ? (
                <p className="py-6 text-center text-small text-ink-muted">{t("Nothing added yet.")}</p>
              ) : (
                <>
                  <ul id={historyId} aria-labelledby={`${historyId}-title`} className="flex flex-col focus-visible:outline-offset-2">
                    {entries.slice(0, visible).map(entryRow)}
                  </ul>
                  {entries.length > HISTORY_STEP && (
                    <LoadMore
                      shown={Math.min(visible, entries.length)}
                      total={entries.length}
                      step={HISTORY_STEP}
                      onMore={() => setVisible((count) => count + HISTORY_STEP)}
                      onLess={visible > HISTORY_STEP ? () => setVisible(HISTORY_STEP) : undefined}
                      focusTargetId={historyId}
                      className="pt-3"
                    />
                  )}
                </>
              )
            ) : failed ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <p role="alert" className="text-small text-ink-muted">
                  {t("Couldn't load this goal's history.")}
                </p>
                <Button variant="secondary" size="sm" onClick={() => setAttempt((count) => count + 1)} className="pointer-coarse:h-11">
                  <RefreshCw aria-hidden="true" />
                  {t("Try again")}
                </Button>
              </div>
            ) : (
              <div className="flex justify-center py-8">
                <Loader size={20} label={t("Loading...")} />
              </div>
            )}
          </section>
        </div>

        {canManage && (
          <div className={cn("flex flex-col gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 pt-3 pb-6")}>
            {(deleteReason || addReason) && (
              <div className="flex flex-col gap-1 text-caption font-normal text-ink-muted">
                {deleteReason && <p id={deleteReasonId}>{deleteReason}</p>}
                {addReason && <p id={addReasonId}>{addReason}</p>}
              </div>
            )}
            <div className={cn("flex items-center gap-2", !wide && "flex-wrap")}>
              {!closed && saved > 0 && (
                <Button variant="secondary" onClick={() => onWithdraw(goal)} className="border-expense-line px-3 text-small text-expense hover:bg-expense-soft">
                  {t("Withdraw")}
                </Button>
              )}
              {(active || paused) && (
                <Button variant="secondary" onClick={() => onTogglePause(goal)} disabled={busy} className="px-3 text-small">
                  {paused ? t("Resume") : t("Pause")}
                </Button>
              )}
              {deletable && (
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => onDelete(goal)}
                  disabled={hasHistory}
                  aria-label={t("Delete goal")}
                  aria-describedby={deleteReason ? deleteReasonId : undefined}
                  title={hasHistory ? undefined : t("Delete goal")}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
              <span className="flex-1" />
              {!closed && (
                <Button variant="action" onClick={() => onAddMoney(goal)} disabled={!canAddMoney || paused} aria-describedby={addReason ? addReasonId : undefined}>
                  <Plus strokeWidth={2.5} className="size-4" />
                  {t("Add money")}
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Fact({ label, value, sub, className }: FactProps) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-md border border-line bg-strip p-3">
      <span className="text-caption font-normal text-ink-muted">{label}</span>
      <span className={cn("text-body font-semibold text-ink tabular-nums", className)}>{value}</span>
      <span className="text-caption font-normal text-ink-muted">{sub}</span>
    </div>
  );
}
