"use client";

import { ArrowLeftRight, CalendarDays, Ellipsis, Eye, Pause, Pencil, PiggyBank, Play, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import AmountText from "@/components/smartly/AmountText";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import EmptyState from "@/components/smartly/EmptyState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import ProgressBar from "@/components/smartly/ProgressBar";
import TabBar from "@/components/smartly/TabBar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { SavingsGoal, SavingsGoalStatus, SavingsOverview } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { deleteSavingsGoalAction, updateSavingsGoalStatusAction } from "@/lib/customer/savingsGoalActions";
import { goalBadge, goalColor, monthsLeft, TREND_META } from "@/lib/customer/savingsDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AddMoneyDrawer } from "./AddMoneyDrawer";
import { GoalDetailDrawer } from "./GoalDetailDrawer";
import { GoalDrawer } from "./GoalDrawer";
import { GoalRing } from "./GoalRing";
import { WithdrawDialog } from "./WithdrawDialog";

interface SavingsGoalsDashboardPageClientProps {
  businessId: string;
  goals: SavingsGoal[];
  overview: SavingsOverview;
  currency: string;
  canManage: boolean;
  // Money can only be added once a savings wallet exists to keep it in.
  hasSavingsWallet: boolean;
  today: string;
}

type Tab = "ALL" | SavingsGoalStatus;
const STATUSES: { value: SavingsGoalStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "COMPLETED", label: "Completed" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];
const MENU_ITEM = "flex h-9 cursor-pointer items-center gap-3 rounded-sm px-3 text-small font-medium text-ink focus:bg-cream [&_svg]:size-3.75";

// Savings goals: how all of them are doing together, then one card per
// goal with its ring, pace, monthly amount and the next thing to do.
export function SavingsGoalsDashboardPageClient({ businessId, goals, overview, currency, canManage, hasSavingsWallet, today }: SavingsGoalsDashboardPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [tab, setTab] = useState<Tab>("ALL");
  const [goalDrawer, setGoalDrawer] = useState<"closed" | "create" | SavingsGoal>("closed");
  const [addMoney, setAddMoney] = useState<SavingsGoal | null>(null);
  const [detail, setDetail] = useState<SavingsGoal | null>(null);
  const [withdraw, setWithdraw] = useState<SavingsGoal | null>(null);
  const [, startTransition] = useTransition();

  const counts = { ALL: goals.length, ...Object.fromEntries(STATUSES.map((status) => [status.value, goals.filter((goal) => goal.status === status.value).length])) } as Record<Tab, number>;
  const shown = tab === "ALL" ? goals : goals.filter((goal) => goal.status === tab);
  const activeCount = counts.ACTIVE;
  const totalSaved = Number(overview.totalSaved);
  const totalGoals = Number(overview.totalGoals);
  const hasRate = Number(overview.savedThisMonth) > 0 && overview.savingsRatePercent > 0;

  function togglePause(goal: SavingsGoal) {
    startTransition(async () => {
      const result = await updateSavingsGoalStatusAction(businessId, goal.id, goal.status === "PAUSED" ? "ACTIVE" : "PAUSED");
      if (result.success) {
        toast.success(goal.status === "PAUSED" ? t("Goal resumed") : t("Goal paused"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to update goal"));
      }
    });
  }

  async function remove(goal: SavingsGoal) {
    if (!(await confirm({ title: `${t("Delete")} ${goal.name}?`, message: t("This can't be undone. A goal with money in it has to be paused or withdrawn instead."), confirmLabel: "Delete goal" }))) return;
    startTransition(async () => {
      const result = await deleteSavingsGoalAction(businessId, goal.id);
      if (result.success) {
        toast.success(t("Goal deleted"));
        setDetail(null);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to delete goal"));
      }
    });
  }

  const editing = typeof goalDrawer === "object" ? goalDrawer : null;

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={`${t("Money")} · ${t("Savings")}`}
        title={t("Savings goals")}
        description={t("Put money aside for what matters, and watch each goal fill up.")}
        actions={
          <>
            {goals.length > 1 && (
              <Button variant="secondary" asChild>
                <Link href="/savings-goals/transfer">
                  <ArrowLeftRight className="text-ink-2" />
                  {t("Move between goals")}
                </Link>
              </Button>
            )}
            {canManage && (
              <Button onClick={() => setGoalDrawer("create")}>
                <Plus strokeWidth={2.5} className="size-4" />
                {t("New goal")}
              </Button>
            )}
          </>
        }
      />

      {!hasSavingsWallet && goals.length > 0 && (
        <section className="flex flex-col gap-4 rounded-lg border border-mint-200 bg-mint-50 p-5 md:flex-row md:items-center md:gap-5 md:px-6">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-surface text-emerald shadow-[0_4px_12px_rgba(14,26,22,0.08)]">
            <PiggyBank className="size-6" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="text-h3 text-ink">{t("One step before you can save: add a savings wallet")}</h2>
            <p className="max-w-170 text-body leading-relaxed text-ink-2">
              {t("A savings wallet is where your saved money actually sits, for example a DPS or FDR account. Add one, then you can start adding money to")} {goals[0].name}.
            </p>
          </div>
          {canManage && (
            <Button variant="action" size="lg" asChild className="shrink-0 px-5">
              <Link href="/savings-goals/wallet">{t("Add savings wallet")}</Link>
            </Button>
          )}
        </section>
      )}

      {goals.length === 0 ? (
        <EmptyState icon={<PiggyBank />} title={t("No savings goal yet")} description={t("Emergency fund, Hajj, a new bike… name it, set a target, and start putting money aside.")} action={canManage && <Button onClick={() => setGoalDrawer("create")}>{t("New goal")}</Button>} className="min-h-80" />
      ) : (
        <>
          <Card padding="none" className="grid md:grid-cols-[1.3fr_1fr_0.8fr]">
            <div className="flex items-center gap-5 px-6 py-5">
              <GoalRing percent={overview.progressPercent} color={totalSaved > 0 ? "var(--emerald)" : "var(--line)"} size={112} label={`${overview.progressPercent}% ${t("of all goals saved")}`}>
                <span className={cn("text-h2", totalSaved === 0 && "text-ink-muted")}>{overview.progressPercent}%</span>
                <span className="text-caption font-normal text-ink-muted">{t("of all goals")}</span>
              </GoalRing>
              <div className="flex flex-col gap-2">
                <span className="text-small font-medium text-ink-muted">{t("Saved so far")}</span>
                <AmountText value={totalSaved} currency={currency} size="h2" className={cn("text-h1", totalSaved === 0 && "text-ink-muted")} />
                <span className="text-small text-ink-muted tabular-nums">
                  {t("of")} {formatCurrency(totalGoals, currency)} ·{" "}
                  {totalSaved > 0 ? (
                    <>
                      <span className="font-semibold text-ink-2">{formatCurrency(overview.remaining, currency)}</span> {t("to go")}
                    </>
                  ) : (
                    `${t("across")} ${goals.length} ${t(goals.length === 1 ? "goal" : "goals")}`
                  )}
                </span>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-3 border-t border-line px-6 py-5 md:border-t-0 md:border-l">
              <div className="flex items-baseline justify-between">
                <span className="text-small font-medium text-ink-muted">{t("Saved this month")}</span>
                <span className="text-caption font-semibold text-ink-2">
                  {overview.monthlyProgressPercent}% {t("of target")}
                </span>
              </div>
              <span className="text-h2 text-ink tabular-nums">
                {formatCurrency(overview.savedThisMonth, currency)} <span className="text-body font-medium text-ink-muted">{t("of")} {formatCurrency(overview.monthlyTarget, currency)}</span>
              </span>
              <ProgressBar value={overview.monthlyProgressPercent} label={t("Saved this month")} />
              <span className="text-caption font-normal text-ink-muted">
                {t("Monthly target across")} {activeCount} {t(activeCount === 1 ? "active goal" : "active goals")}
              </span>
            </div>
            <div className="flex flex-col justify-center gap-2 border-t border-line px-6 py-5 md:border-t-0 md:border-l">
              <span className="text-small font-medium text-ink-muted">{t("Savings rate")}</span>
              <span className={cn("text-h1", !hasRate && "text-h2 text-ink-muted")}>{hasRate ? `${overview.savingsRatePercent}%` : "—"}</span>
              <span className="text-caption font-normal text-ink-muted">{hasRate ? t("of this month's income") : t("Shows once you save and earn")}</span>
            </div>
          </Card>

          <TabBar options={[{ value: "ALL" as Tab, label: t("All"), count: counts.ALL }, ...STATUSES.map((status) => ({ value: status.value as Tab, label: t(status.label), count: counts[status.value] }))]} value={tab} onChange={setTab} label={t("Goal status")} className="max-md:overflow-x-auto" />

          <div className="grid gap-4 md:grid-cols-2">
            {shown.length === 0 && <p className="py-8 text-center text-body text-ink-muted md:col-span-2">{t("No goal here.")}</p>}
            {shown.map((goal) => {
              const index = goals.indexOf(goal);
              const badge = goalBadge(goal);
              const paused = goal.status === "PAUSED";
              const closed = goal.status === "WITHDRAWN";
              const left = monthsLeft(goal.targetDate, today);
              const trend = goal.trend ? TREND_META[goal.trend] : null;
              return (
                <Card key={goal.id} className={cn("flex gap-5", paused && "opacity-85", closed && "opacity-70")}>
                  <GoalRing percent={closed ? 100 : goal.progressPercent} color={goalColor(index, goal.status)} size={92} label={`${goal.progressPercent}% ${t("saved")}`}>
                    <span className="text-h3 font-bold">{closed ? "✓" : `${goal.progressPercent}%`}</span>
                  </GoalRing>
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <span className="truncate text-title text-ink">{goal.name}</span>
                      <Chip tone={badge.chip} size="sm" className="font-semibold">
                        {t(badge.label)}
                      </Chip>
                      <span className="flex-1" />
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger aria-label={`${t("Actions for")} ${goal.name}`} className="flex size-7.5 shrink-0 items-center justify-center rounded-md text-ink-2 hover:bg-cream data-open:bg-cream">
                            <Ellipsis className="size-4.5" aria-hidden="true" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={6} className="w-49 rounded-md border border-line bg-surface p-2 shadow-overlay ring-0">
                            <DropdownMenuItem onSelect={() => setDetail(goal)} className={MENU_ITEM}>
                              <Eye aria-hidden="true" />
                              {t("Details")}
                            </DropdownMenuItem>
                            {!closed && (
                              <DropdownMenuItem onSelect={() => setGoalDrawer(goal)} className={MENU_ITEM}>
                                <Pencil aria-hidden="true" />
                                {t("Edit goal")}
                              </DropdownMenuItem>
                            )}
                            {(goal.status === "ACTIVE" || paused) && (
                              <DropdownMenuItem onSelect={() => togglePause(goal)} className={MENU_ITEM}>
                                {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
                                {paused ? t("Resume goal") : t("Pause goal")}
                              </DropdownMenuItem>
                            )}
                            {!closed && Number(goal.currentAmount) > 0 && (
                              <DropdownMenuItem onSelect={() => setWithdraw(goal)} className={MENU_ITEM}>
                                <ArrowLeftRight aria-hidden="true" />
                                {t("Withdraw")}
                              </DropdownMenuItem>
                            )}
                            {!closed && (
                              <>
                                <DropdownMenuSeparator className="my-1 bg-line" />
                                <DropdownMenuItem onSelect={() => remove(goal)} className={cn(MENU_ITEM, "text-expense focus:bg-expense-soft focus:text-expense")}>
                                  <Trash2 aria-hidden="true" />
                                  {t("Delete goal")}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <span className="text-h2 tracking-[-0.01em] text-ink tabular-nums">
                      {formatCurrency(closed ? goal.withdrawnAmount : goal.currentAmount, currency)} <span className="text-small font-medium text-ink-muted">{t("of")} {formatCurrency(goal.targetAmount, currency)}</span>
                    </span>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-caption font-normal text-ink-muted">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        {formatDate(goal.targetDate, "MMM yyyy")} · {paused ? t("paused") : closed ? t("withdrawn") : `${left} ${t(left === 1 ? "month left" : "months left")}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <PiggyBank className="size-3.5" aria-hidden="true" />
                        {paused ? t("No monthly target while paused") : closed ? t("Paid out") : `${t("Save")} ${formatCurrency(goal.monthlyTarget, currency)} ${t("a month")}`}
                      </span>
                      {trend && <span className={cn("font-semibold", trend.text)}>{t(trend.label)}</span>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3">
                      {canManage && paused && (
                        <Button variant="secondary" size="sm" onClick={() => togglePause(goal)} className="h-8.5 px-3 text-small">
                          <Play className="size-3.5" />
                          {t("Resume goal")}
                        </Button>
                      )}
                      {canManage && !paused && !closed && (
                        <Button variant="soft" size="sm" onClick={() => setAddMoney(goal)} disabled={!hasSavingsWallet} title={hasSavingsWallet ? undefined : t("Add a savings wallet first")} className="h-8.5 px-3 text-small">
                          <Plus className="size-3.5" strokeWidth={2.5} />
                          {t("Add money")}
                        </Button>
                      )}
                      {canManage && !paused && !closed && !hasSavingsWallet && <span className="text-caption font-normal text-ink-muted">{t("Needs a savings wallet")}</span>}
                      <button type="button" onClick={() => setDetail(goal)} className="text-small font-semibold text-emerald hover:text-emerald-hover">
                        {t("Details")}
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
            {canManage && tab === "ALL" && (
              <button type="button" onClick={() => setGoalDrawer("create")} className="flex min-h-33 flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-line-strong bg-surface transition-colors hover:border-emerald">
                <span className="flex size-10 items-center justify-center rounded-full bg-mint-50 text-emerald">
                  <Plus className="size-4.5" strokeWidth={2.5} aria-hidden="true" />
                </span>
                <span className="text-body font-semibold text-ink">{t("New goal")}</span>
                <span className="text-caption font-normal text-ink-muted">{t("Emergency fund, Hajj, a new bike…")}</span>
              </button>
            )}
          </div>
        </>
      )}

      <GoalDrawer open={goalDrawer !== "closed"} onClose={() => setGoalDrawer("closed")} businessId={businessId} editing={editing} currency={currency} today={today} />
      <AddMoneyDrawer open={addMoney !== null} onClose={() => setAddMoney(null)} businessId={businessId} goal={addMoney} goalIndex={addMoney ? goals.indexOf(addMoney) : 0} currency={currency} />
      <GoalDetailDrawer
        open={detail !== null}
        onClose={() => setDetail(null)}
        businessId={businessId}
        goal={detail}
        goalIndex={detail ? goals.indexOf(detail) : 0}
        currency={currency}
        today={today}
        canManage={canManage}
        canAddMoney={hasSavingsWallet}
        onEdit={(goal) => {
          setDetail(null);
          setGoalDrawer(goal);
        }}
        onAddMoney={(goal) => {
          setDetail(null);
          setAddMoney(goal);
        }}
        onWithdraw={(goal) => {
          setDetail(null);
          setWithdraw(goal);
        }}
        onTogglePause={togglePause}
        onDelete={remove}
      />
      <WithdrawDialog open={withdraw !== null} onClose={() => setWithdraw(null)} businessId={businessId} goal={withdraw} currency={currency} />
      {confirmDialog}
    </PageFrame>
  );
}
