"use client";

import { ArrowLeftRight, Minus, Pause, Pencil, Play, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { SavingsGoal, SavingsGoalDetail, SavingsGoalEntry } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { getSavingsGoalDetailAction } from "@/lib/customer/savingsGoalActions";
import { ENTRY_META, goalBadge, goalColor, monthsLeft, remainingOf, TREND_META } from "@/lib/customer/savingsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { GoalRing } from "./GoalRing";

interface GoalDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  goal: SavingsGoal | null;
  goalIndex: number;
  currency: string;
  today: string;
  canManage: boolean;
  // Whether money can be added right now (a savings wallet exists).
  canAddMoney: boolean;
  onEdit: (goal: SavingsGoal) => void;
  onAddMoney: (goal: SavingsGoal) => void;
  onWithdraw: (goal: SavingsGoal) => void;
  onTogglePause: (goal: SavingsGoal) => void;
  onDelete: (goal: SavingsGoal) => void;
}

const ENTRY_ICON = { CONTRIBUTION: Plus, TRANSFER_IN: ArrowLeftRight, TRANSFER_OUT: ArrowLeftRight, WITHDRAWAL: Minus } as const;
const ENTRY_TILE = { income: "bg-mint-50 text-emerald", info: "bg-info-soft text-info", expense: "bg-expense-soft text-expense" } as const;

// One goal in full: how far along it is, when and how much a month, how it
// has been going lately, and everything that moved in or out of it.
export function GoalDetailDrawer({ open, onClose, businessId, goal, goalIndex, currency, today, canManage, canAddMoney, onEdit, onAddMoney, onWithdraw, onTogglePause, onDelete }: GoalDetailDrawerProps) {
  const { t } = useLocale();
  const wide = useMediaQuery("(min-width: 768px)");
  const [detail, setDetail] = useState<SavingsGoalDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [prevKey, setPrevKey] = useState("closed");
  const key = open && goal ? goal.id : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setDetail(null);
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!open || !goal) return;
    getSavingsGoalDetailAction(businessId, goal.id).then((data) => {
      setDetail(data);
      setLoading(false);
    });
  }, [open, goal, businessId]);

  if (!goal) return null;
  const badge = goalBadge(goal);
  const left = monthsLeft(goal.targetDate, today);
  const trend = goal.trend ? TREND_META[goal.trend] : null;
  const active = goal.status === "ACTIVE";
  const paused = goal.status === "PAUSED";
  const closed = goal.status === "WITHDRAWN";

  const entryLine = (entry: SavingsGoalEntry) => {
    const route = entry.type === "WITHDRAWAL" ? entry.savingsAccountName : [entry.moneyAccountName, entry.savingsAccountName].filter(Boolean).join(" → ");
    return [formatDate(entry.date), route || (entry.relatedGoalName ? t("goal transfer") : null)].filter(Boolean).join(" · ");
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-120 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] sm:max-w-120" : "h-[92vh] rounded-t-xl")}
      >
        <SheetHeader className={cn("flex-row items-center gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <SheetTitle className="truncate text-h3 text-ink">{goal.name}</SheetTitle>
          <Chip tone={badge.chip} size="sm" className="font-semibold">
            {t(badge.label)}
          </Chip>
          <span className="flex-1" />
          {canManage && !closed && (
            <button type="button" onClick={() => onEdit(goal)} aria-label={t("Edit goal")} title={t("Edit goal")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-2 hover:bg-surface-sunken">
              <Pencil className="size-4" aria-hidden="true" />
            </button>
          )}
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <div className={cn("flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
          <div className="flex items-center gap-6">
            <GoalRing percent={goal.progressPercent} color={goalColor(goalIndex, goal.status)} size={128} label={`${goal.progressPercent}% ${t("saved")}`}>
              <span className="text-h1">{goal.progressPercent}%</span>
              <span className="text-caption font-normal text-ink-muted">{t("saved")}</span>
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
                <div className="flex flex-col gap-px">
                  <span className="text-caption font-normal text-ink-muted">{t("To go")}</span>
                  <span className="text-body font-semibold text-ink">{formatCurrency(remainingOf(goal), currency)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Fact label={t("Reach by")} value={formatDate(goal.targetDate, "MMM yyyy")} sub={paused ? t("paused") : `${left} ${t(left === 1 ? "month left" : "months left")}`} />
            <Fact label={t("Monthly target")} value={paused ? "—" : formatCurrency(goal.monthlyTarget, currency)} sub={paused ? t("while paused") : t("to finish on time")} />
            <Fact label={t("Lately")} value={trend ? t(trend.short) : "—"} sub={trend ? t("than before") : t("too early to say")} className={trend?.text} />
          </div>

          {goal.description && <p className="text-body text-ink-2">{goal.description}</p>}

          <section className="flex flex-col">
            <h3 className="mb-3 text-body font-semibold text-ink">{t("History")}</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader size={20} label={t("Loading...")} />
              </div>
            ) : !detail ? (
              <p className="py-6 text-center text-small text-ink-muted">{t("Couldn't load this goal.")}</p>
            ) : detail.entries.length === 0 ? (
              <p className="py-6 text-center text-small text-ink-muted">{t("Nothing added yet.")}</p>
            ) : (
              detail.entries.map((entry) => {
                const meta = ENTRY_META[entry.type];
                const Icon = ENTRY_ICON[entry.type];
                return (
                  <div key={entry.id} className="flex items-center gap-3 border-b border-surface-sunken py-3">
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", ENTRY_TILE[meta.tone])}>
                      <Icon className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-px">
                      <span className="text-small font-medium text-ink">
                        {t(meta.title)}
                        {entry.relatedGoalName && ` ${entry.relatedGoalName}`}
                      </span>
                      <span className="truncate text-caption font-normal text-ink-muted">{entryLine(entry)}</span>
                    </span>
                    <span className={cn("text-body font-semibold tabular-nums", meta.tone === "income" ? "text-income" : meta.tone === "info" ? "text-info" : "text-expense")}>
                      {meta.flow === "in" ? "+" : "−"} {formatCurrency(entry.amount, currency)}
                    </span>
                  </div>
                );
              })
            )}
          </section>
        </div>

        {canManage && (
          <div className={cn("flex items-center gap-2 border-t border-line bg-surface", wide ? "px-6 py-4" : "flex-wrap px-4 pt-3 pb-6")}>
            {!closed && Number(goal.currentAmount) > 0 && (
              <Button variant="secondary" onClick={() => onWithdraw(goal)} className="border-[#F2C9C0] px-3 text-small text-expense hover:bg-expense-soft dark:border-expense/40">
                {t("Withdraw")}
              </Button>
            )}
            {(active || paused) && (
              <Button variant="secondary" onClick={() => onTogglePause(goal)} className="px-3 text-small">
                {paused ? <Play /> : <Pause />}
                {paused ? t("Resume") : t("Pause")}
              </Button>
            )}
            {!closed && (
              <Button variant="secondary" size="icon" onClick={() => onDelete(goal)} aria-label={t("Delete goal")} title={t("Delete goal")}>
                <Trash2 className="size-4" />
              </Button>
            )}
            <span className="flex-1" />
            {!closed && (
              <Button onClick={() => onAddMoney(goal)} disabled={!canAddMoney || paused} title={canAddMoney ? undefined : t("Add a savings wallet first")}>
                <Plus strokeWidth={2.5} className="size-4" />
                {t("Add money")}
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Fact({ label, value, sub, className }: { label: string; value: string; sub: string; className?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-line bg-cream p-3">
      <span className="text-caption font-normal text-ink-muted">{label}</span>
      <span className={cn("text-body font-semibold text-ink tabular-nums", className)}>{value}</span>
      <span className="text-caption font-normal text-ink-muted">{sub}</span>
    </div>
  );
}
