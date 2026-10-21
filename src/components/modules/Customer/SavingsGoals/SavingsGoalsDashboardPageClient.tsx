"use client";

import { ArrowLeftRight, CalendarDays, Ellipsis, Eye, Lock, Pause, Pencil, PiggyBank, Play, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
import { goalBadge, goalColor, goalTotals, ringPercent, savingsError, timeLeftText, TREND_META } from "@/lib/customer/savingsDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AddMoneyDrawer } from "./AddMoneyDrawer";
import { GoalDetailDrawer } from "./GoalDetailDrawer";
import { GoalDrawer } from "./GoalDrawer";
import { GoalRing } from "./GoalRing";
import { RestoreWalletButton } from "./RestoreWalletButton";
import { WithdrawDialog } from "./WithdrawDialog";

interface SavingsGoalsDashboardPageClientProps {
  businessId: string;
  goals: SavingsGoal[];
  overview: SavingsOverview;
  currency: string;
  canManage: boolean;
  // Money can only be added once a savings wallet exists to keep it in.
  hasSavingsWallet: boolean;
  // With no active savings wallet, the ones archived: the banner offers them
  // back instead of the first-run "add a savings wallet".
  archivedWallets: { id: string; name: string }[];
  today: string;
}

type Tab = "ALL" | SavingsGoalStatus;
const STATUSES: { value: SavingsGoalStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "COMPLETED", label: "Completed" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];
const MENU_ITEM = "flex h-9 cursor-pointer items-center gap-3 rounded-sm px-3 text-small font-medium text-ink focus:bg-surface-sunken [&_svg]:size-3.75";

// Savings goals: how all of them are doing together, then one card per
// goal with its ring, pace, monthly amount and the next thing to do.
export function SavingsGoalsDashboardPageClient({ businessId, goals, overview, currency, canManage, hasSavingsWallet, archivedWallets, today }: SavingsGoalsDashboardPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [tab, setTab] = useState<Tab>("ALL");
  // Each drawer remembers which goal it is open on, by id; the goal itself is
  // read from the list on every render, so after Pause (and the refresh) the
  // drawer shows the goal as it now is, not as it was when opened.
  const [goalDrawer, setGoalDrawer] = useState<"closed" | "create" | { id: string }>("closed");
  const [addMoneyId, setAddMoneyId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ?new=1 opens the New goal drawer for a reader who can add one, also when
  // the link is followed from this page.
  const asked = canManage && searchParams.get("new") === "1";
  const [prevAsked, setPrevAsked] = useState(false);
  if (asked !== prevAsked) {
    setPrevAsked(asked);
    if (asked) setGoalDrawer("create");
  }
  // Then the URL forgets it, so Back or a refresh doesn't open it again.
  useEffect(() => {
    if (!searchParams.has("new")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  const byId = (id: string | null) => (id === null ? null : (goals.find((goal) => goal.id === id) ?? null));
  const indexOf = (goal: SavingsGoal | null) => (goal ? Math.max(0, goals.findIndex((item) => item.id === goal.id)) : 0);
  const editing = typeof goalDrawer === "object" ? byId(goalDrawer.id) : null;
  const addMoney = byId(addMoneyId);
  const detail = byId(detailId);
  const withdraw = byId(withdrawId);

  const counts = { ALL: goals.length, ...Object.fromEntries(STATUSES.map((status) => [status.value, goals.filter((goal) => goal.status === status.value).length])) } as Record<Tab, number>;
  // One goal needs no status tabs.
  const tabbed = goals.length > 1;
  const shown = !tabbed || tab === "ALL" ? goals : goals.filter((goal) => goal.status === tab);
  const activeGoals = goals.filter((goal) => goal.status === "ACTIVE");
  const activeCount = counts.ACTIVE;
  // A move needs two goals that are still open.
  const canMove = goals.filter((goal) => goal.status !== "WITHDRAWN").length > 1;
  // No savings wallet yet: nothing can be saved, so the page shows targets
  // and what's missing rather than progress.
  const setup = !hasSavingsWallet;
  // Worked out here, over the goals still open: the overview adds a
  // withdrawn goal's whole target to what is left to save.
  const totals = goalTotals(goals);
  const hasRate = Number(overview.savedThisMonth) > 0 && overview.savingsRatePercent > 0;

  function togglePause(goal: SavingsGoal) {
    if (isPending) return;
    const resuming = goal.status === "PAUSED";
    startTransition(async () => {
      const result = await updateSavingsGoalStatusAction(businessId, goal.id, resuming ? "ACTIVE" : "PAUSED");
      if (result.success) {
        toast.success(resuming ? t("Goal resumed") : t("Goal paused"));
        router.refresh();
      } else {
        toast.error(savingsError(result.message, "Failed to update goal", t, currency));
      }
    });
  }

  async function remove(goal: SavingsGoal) {
    if (!(await confirm({ title: t("Delete {name}?", { name: goal.name }), message: t("This can't be undone. Only a goal that never had money added or moved can be deleted."), confirmLabel: "Delete goal" }))) return;
    startTransition(async () => {
      const result = await deleteSavingsGoalAction(businessId, goal.id);
      if (result.success) {
        toast.success(t("Goal deleted"));
        setDetailId(null);
        router.refresh();
      } else {
        toast.error(savingsError(result.message, "Failed to delete goal", t, currency));
      }
    });
  }

  // Before money can go in: a first savings wallet to add, or the archived
  // ones to bring back (archiving the only wallet used to look like a new
  // account while the goals still held money).
  const setupBanner = () => {
    if (archivedWallets.length > 0) {
      const one = archivedWallets.length === 1;
      return (
        <SetupBanner
          title={one ? t("Your savings wallet is archived") : t("Your savings wallets are archived")}
          text={!canManage ? (one ? t("Ask the workspace owner to restore it.") : t("Ask the workspace owner to restore one of them.")) : one ? t("Restore it to add money to your goals or withdraw from them again.") : t("Restore one to add money to your goals or withdraw from them again.")}
          action={
            canManage && (
              <>
                {one ? (
                  <RestoreWalletButton businessId={businessId} walletId={archivedWallets[0].id} walletName={archivedWallets[0].name} appearance="button" />
                ) : (
                  <Button variant="action" size="lg" asChild>
                    <Link href="/savings-goals/overview">{t("See archived wallets")}</Link>
                  </Button>
                )}
                <Button variant="secondary" size="lg" asChild>
                  <Link href="/savings-goals/wallet?add=1">{t("Add savings wallet")}</Link>
                </Button>
              </>
            )
          }
        />
      );
    }
    return (
      <SetupBanner
        title={t("One step before you can save: add a savings wallet")}
        text={
          canManage
            ? t("A savings wallet is where your saved money actually sits, for example a DPS or FDR account. Add one, then you can start adding money to {name}.", { name: goals[0].name })
            : t("A savings wallet is where your saved money actually sits, for example a DPS or FDR account. Ask the workspace owner to add one.")
        }
        action={
          canManage && (
            <Button variant="action" size="lg" asChild>
              <Link href="/savings-goals/wallet?add=1">{t("Add savings wallet")}</Link>
            </Button>
          )
        }
      />
    );
  };

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={`${t("Money")} · ${t("Savings")}`}
        title={t("Savings goals")}
        description={t("Put money aside for what matters, and watch each goal fill up.")}
        actions={
          <>
            {canMove && (
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

      {setup && goals.length > 0 && setupBanner()}

      {goals.length === 0 ? (
        <EmptyState icon={<PiggyBank />} title={t("No savings goal yet")} description={t("Emergency fund, Hajj, a new bike… name it, set a target, and start putting money aside.")} action={canManage && <Button onClick={() => setGoalDrawer("create")}>{t("New goal")}</Button>} className="min-h-80" />
      ) : (
        <>
          <Card padding="none" className="grid md:grid-cols-[1.3fr_1fr_0.8fr]">
            <div className="flex items-center gap-5 px-6 py-5">
              <GoalRing percent={totals.percent} color={totals.saved > 0 ? "var(--emerald)" : "var(--line)"} size={setup ? 96 : 112} label={t("{percent}% of all goals saved", { percent: formatCount(totals.percent, locale) })}>
                <span className={cn("text-h2", totals.saved === 0 && "text-ink-muted")}>{formatCount(totals.percent, locale)}%</span>
                {!setup && <span className="text-caption font-normal text-ink-muted">{t("of all goals")}</span>}
              </GoalRing>
              <div className="flex min-w-0 flex-col gap-2">
                <span className="text-small leading-[normal] font-medium text-ink-muted">{t("Saved so far")}</span>
                <AmountText value={totals.saved} currency={currency} size="h2" className={cn("text-h1 leading-[normal]", totals.saved === 0 && "text-ink-muted")} />
                {/* Pretty wrapping keeps "৳1,30,000 to go" together rather
                    than leaving "go" alone on the second line beside the ring. */}
                <span className="text-small leading-[normal] text-pretty text-ink-muted tabular-nums">
                  {totals.count === 0
                    ? t("All your goals are withdrawn")
                    : totals.saved > 0
                      ? fillNodes(t("of {total} · {left} to go"), { total: formatCurrency(totals.target, currency), left: <span className="font-semibold text-ink-2">{formatCurrency(totals.toGo, currency)}</span> })
                      : t(totals.count === 1 ? "of {amount} across {count} goal" : "of {amount} across {count} goals", { amount: formatCurrency(totals.target, currency), count: formatCount(totals.count, locale) })}
                </span>
              </div>
            </div>
            {setup ? (
              <div className="flex flex-col justify-center gap-2 border-t border-line px-6 py-5 md:border-t-0 md:border-l">
                <span className="text-small leading-[normal] font-medium text-ink-muted">{t("Monthly target")}</span>
                <span className="text-h2 leading-[normal] text-ink tabular-nums">{formatCurrency(overview.monthlyTarget, currency)}</span>
                <span className="text-caption leading-[normal] font-normal text-ink-muted">
                  {activeGoals.length === 1
                    ? t("To reach {name} by {date}", { name: activeGoals[0].name, date: formatDate(activeGoals[0].targetDate, "MMM yyyy", locale) })
                    : t(activeCount === 1 ? "Across {count} active goal" : "Across {count} active goals", { count: formatCount(activeCount, locale) })}
                </span>
              </div>
            ) : (
              <div className="flex flex-col justify-center gap-3 border-t border-line px-6 py-5 md:border-t-0 md:border-l">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-small leading-[normal] font-medium text-ink-muted">{t("Saved this month")}</span>
                  <span className="text-caption leading-[normal] font-semibold text-ink-2">{t("{percent}% of target", { percent: formatCount(overview.monthlyProgressPercent, locale) })}</span>
                </div>
                <span className="text-body font-medium text-ink-muted tabular-nums">
                  {fillNodes(t("{saved} of {target}"), { saved: <span className="text-h2 leading-[normal] text-ink">{formatCurrency(overview.savedThisMonth, currency)}</span>, target: formatCurrency(overview.monthlyTarget, currency) })}
                </span>
                <ProgressBar value={overview.monthlyProgressPercent} label={t("Saved this month")} />
                <span className="text-caption leading-[normal] font-normal text-ink-muted">
                  {t(activeCount === 1 ? "Monthly target across {count} active goal" : "Monthly target across {count} active goals", { count: formatCount(activeCount, locale) })}
                </span>
              </div>
            )}
            <div className="flex flex-col justify-center gap-2 border-t border-line px-6 py-5 md:border-t-0 md:border-l">
              <span className="text-small leading-[normal] font-medium text-ink-muted">{t("Savings rate")}</span>
              <span className={cn("text-h1", !hasRate && "text-h2 text-ink-muted", "leading-[normal]")}>{hasRate ? `${formatCount(overview.savingsRatePercent, locale)}%` : "—"}</span>
              <span className="text-caption leading-[normal] font-normal text-ink-muted">
                {hasRate ? t("of this month's income ({amount})", { amount: formatCurrency(overview.incomeThisMonth, currency) }) : t("Shows once you save and earn")}
              </span>
            </div>
          </Card>

          {tabbed && <TabBar options={[{ value: "ALL" as Tab, label: t("All"), count: counts.ALL }, ...STATUSES.map((status) => ({ value: status.value as Tab, label: t(status.label), count: counts[status.value] }))]} value={tab} onChange={setTab} label={t("Goal status")} className="max-md:overflow-x-auto" />}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {shown.length === 0 && <p className="py-8 text-center text-body text-ink-muted md:col-span-2">{t("No goal here.")}</p>}
            {shown.map((goal) => {
              const index = indexOf(goal);
              const badge = goalBadge(goal);
              const paused = goal.status === "PAUSED";
              const closed = goal.status === "WITHDRAWN";
              const completed = goal.status === "COMPLETED";
              const percent = ringPercent(goal);
              const trend = goal.trend && !setup ? TREND_META[goal.trend] : null;
              // Money can't go in until a savings wallet exists; the card says why.
              const locked = canManage && setup && !paused && !closed;
              // The backend deletes only a goal nothing was ever added to or
              // moved out of: never one holding money, never a finished one.
              const deletable = !closed && !completed && Number(goal.currentAmount) <= 0;
              return (
                <Card key={goal.id} className={cn("flex gap-5", paused && "opacity-85", closed && "opacity-70")}>
                  {/* A withdrawn goal shows what it paid out, not a full ring. */}
                  <GoalRing
                    percent={percent}
                    color={goalColor(index, goal.status)}
                    size={92}
                    label={closed ? t("Withdrawn {amount}", { amount: formatCurrency(goal.withdrawnAmount, currency) }) : t("{percent}% saved", { percent: formatCount(percent, locale) })}
                  >
                    <span className="text-h3 font-bold">{closed && percent >= 100 ? "✓" : `${formatCount(percent, locale)}%`}</span>
                  </GoalRing>
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    {/* The name keeps two lines beside the ring on a phone; the
                        chip drops under it when the two don't fit side by side. */}
                    <div className="flex items-start gap-3">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="line-clamp-2 min-w-0 text-title leading-[normal] wrap-break-word text-ink">{goal.name}</span>
                        <Chip tone={badge.chip} size="sm" className="font-semibold">
                          {t(badge.label)}
                        </Chip>
                      </div>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label={t("Actions for {name}", { name: goal.name })}
                            className="flex size-7.5 shrink-0 items-center justify-center rounded-md text-ink-2 hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11"
                          >
                            <Ellipsis className="size-4.5" aria-hidden="true" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={6} className="w-49 rounded-md border border-line bg-surface p-2 shadow-overlay ring-0">
                            <DropdownMenuItem onSelect={() => setDetailId(goal.id)} className={MENU_ITEM}>
                              <Eye aria-hidden="true" />
                              {t("Details")}
                            </DropdownMenuItem>
                            {!closed && (
                              <DropdownMenuItem onSelect={() => setGoalDrawer({ id: goal.id })} className={MENU_ITEM}>
                                <Pencil aria-hidden="true" />
                                {t("Edit goal")}
                              </DropdownMenuItem>
                            )}
                            {(goal.status === "ACTIVE" || paused) && (
                              <DropdownMenuItem onSelect={() => togglePause(goal)} disabled={isPending} className={MENU_ITEM}>
                                {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
                                {paused ? t("Resume goal") : t("Pause goal")}
                              </DropdownMenuItem>
                            )}
                            {!closed && Number(goal.currentAmount) > 0 && (
                              <DropdownMenuItem onSelect={() => setWithdrawId(goal.id)} className={MENU_ITEM}>
                                <ArrowLeftRight aria-hidden="true" />
                                {t("Withdraw")}
                              </DropdownMenuItem>
                            )}
                            {deletable && (
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
                    {/* One sentence, so Bangla can put the target first. */}
                    <span className="text-small leading-[normal] font-medium text-ink-muted tabular-nums">
                      {fillNodes(t("{saved} of {target}"), {
                        saved: <span className="text-h2 leading-[normal] tracking-[-0.01em] text-ink">{formatCurrency(closed ? goal.withdrawnAmount : goal.currentAmount, currency)}</span>,
                        target: formatCurrency(goal.targetAmount, currency),
                      })}
                    </span>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-caption leading-[normal] font-normal text-ink-muted">
                      <span className="flex items-center gap-1">
                        {!setup && <CalendarDays className="size-3.5" aria-hidden="true" />}
                        {formatDate(goal.targetDate, "MMM yyyy", locale)} · {paused ? t("paused") : closed ? t("withdrawn") : completed ? t("Reached") : timeLeftText(goal.targetDate, today, t, locale)}
                      </span>
                      {/* A reached goal has no monthly amount left to keep up. */}
                      {!completed && (
                        <span className="flex items-center gap-1">
                          {!setup && <PiggyBank className="size-3.5" aria-hidden="true" />}
                          {paused ? t("No monthly target while paused") : closed ? t("Paid out") : t("Save {amount} a month", { amount: formatCurrency(goal.monthlyTarget, currency) })}
                        </span>
                      )}
                      {trend && <span className={cn("font-semibold", trend.text)}>{t(trend.label)}</span>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3">
                      {canManage && paused && (
                        <Button variant="secondary" size="sm" onClick={() => togglePause(goal)} disabled={isPending} className="pointer-coarse:h-11">
                          <Play className="size-3.5" />
                          {t("Resume goal")}
                        </Button>
                      )}
                      {locked && (
                        <Button variant="secondary" size="sm" disabled className="border-line bg-strip text-ink-muted disabled:opacity-100 pointer-coarse:h-11">
                          <Lock className="size-3.5 text-line-strong" strokeWidth={2.5} />
                          {t("Add money")}
                        </Button>
                      )}
                      {canManage && !setup && !paused && !closed && (
                        <Button variant="soft" size="sm" onClick={() => setAddMoneyId(goal.id)} className="pointer-coarse:h-11">
                          <Plus className="size-3.5" strokeWidth={2.5} />
                          {t("Add money")}
                        </Button>
                      )}
                      {locked ? (
                        <span className="text-caption leading-[normal] font-normal text-ink-muted">{t("Needs a savings wallet")}</span>
                      ) : (
                        <button type="button" onClick={() => setDetailId(goal.id)} className="inline-flex h-9 items-center text-small font-semibold text-emerald hover:text-emerald-hover pointer-coarse:h-11">
                          {t("Details")}
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
            {canManage && (!tabbed || tab === "ALL") && (
              <button type="button" onClick={() => setGoalDrawer("create")} className="flex min-h-33 flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-line-strong bg-surface transition-colors hover:border-emerald">
                <span className="flex size-10 items-center justify-center rounded-full bg-mint-50 text-emerald">
                  <Plus className="size-4.5" strokeWidth={2.5} aria-hidden="true" />
                </span>
                <span className="text-body leading-[normal] font-semibold text-ink">{t("New goal")}</span>
                <span className="text-caption leading-[normal] font-normal text-ink-muted">{t("Emergency fund, Hajj, a new bike…")}</span>
              </button>
            )}
          </div>
        </>
      )}

      <GoalDrawer open={goalDrawer === "create" || editing !== null} onClose={() => setGoalDrawer("closed")} businessId={businessId} editing={editing} currency={currency} today={today} />
      <AddMoneyDrawer open={addMoney !== null} onClose={() => setAddMoneyId(null)} businessId={businessId} goal={addMoney} goalIndex={indexOf(addMoney)} currency={currency} />
      <GoalDetailDrawer
        open={detail !== null}
        onClose={() => setDetailId(null)}
        businessId={businessId}
        goal={detail}
        goalIndex={indexOf(detail)}
        currency={currency}
        today={today}
        canManage={canManage}
        canAddMoney={hasSavingsWallet}
        hasArchivedWallets={archivedWallets.length > 0}
        busy={isPending}
        onEdit={(goal) => {
          setDetailId(null);
          setGoalDrawer({ id: goal.id });
        }}
        onAddMoney={(goal) => {
          setDetailId(null);
          setAddMoneyId(goal.id);
        }}
        onWithdraw={(goal) => {
          setDetailId(null);
          setWithdrawId(goal.id);
        }}
        onTogglePause={togglePause}
        onDelete={remove}
      />
      <WithdrawDialog open={withdraw !== null} onClose={() => setWithdrawId(null)} businessId={businessId} goal={withdraw} currency={currency} />
      {confirmDialog}
    </PageFrame>
  );
}

// The note above the goals while money can't go in yet.
function SetupBanner({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-mint-200 bg-mint-50 p-5 md:flex-row md:items-center md:gap-5 md:px-6">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-surface text-emerald shadow-[0_4px_12px_rgba(14,26,22,0.08)]">
        <PiggyBank className="size-6.5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="text-h3 leading-[normal] tracking-normal text-ink">{title}</h2>
        <p className="max-w-170 text-body leading-[1.55] text-ink-2">{text}</p>
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-3">{action}</div>}
    </section>
  );
}
