"use client";

import { ArrowLeftRight, ArrowRight, PiggyBank, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import EmptyState from "@/components/smartly/EmptyState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import TabBar from "@/components/smartly/TabBar";
import type { Account, SavingsGoal, SavingsGoalStatus, SavingsOverview } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { deleteSavingsGoalAction, updateSavingsGoalStatusAction } from "@/lib/customer/savingsGoalActions";
import { goalColor, savingsError } from "@/lib/customer/savingsDisplay";
import { behindFirst, goalsHero, isBehind, monthlyFromNow } from "@/lib/customer/savingsPlan";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AddMoneyDialog } from "./AddMoneyDialog";
import { CatchUpDialog } from "./CatchUpDialog";
import { GoalCard, type GoalAction } from "./GoalCard";
import { GoalDetailsDialog } from "./GoalDetailsDialog";
import { GoalFormDialog } from "./GoalFormDialog";
import { GoalReachedDialog } from "./GoalReachedDialog";
import { GoalRing } from "./GoalRing";
import { GoalStatementDialog } from "./GoalStatementDialog";
import { MoveMoneyDialog, type MoveSetup } from "./MoveMoneyDialog";
import { RestoreWalletButton } from "./RestoreWalletButton";
import { SavingsAccountDialog } from "./SavingsAccountDialog";
import { WithdrawDialog } from "./WithdrawDialog";

interface GoalsPageClientProps {
  businessId: string;
  goals: SavingsGoal[];
  overview: SavingsOverview;
  currency: string;
  canManage: boolean;
  // Active savings wallets (where money goes in) and the main balance
  // accounts (where it comes from and is withdrawn to).
  savingsWallets: Account[];
  moneyAccounts: Account[];
  // With no active savings wallet, the archived ones: the banner offers them back.
  archivedWallets: { id: string; name: string }[];
  // Every savings wallet's name, so a new one can't repeat one.
  walletNames: { id: string; name: string }[];
  person: { name: string; email: string };
  today: string;
}

type Tab = "ALL" | "ACTIVE" | "PAUSED" | "COMPLETED" | "WITHDRAWN";
type Modal =
  | { kind: "goal"; id?: string }
  | { kind: "add"; id: string; amount?: number }
  | { kind: "details"; id: string }
  | { kind: "withdraw"; id: string }
  | { kind: "catch"; id: string }
  | { kind: "move"; setup: MoveSetup }
  | { kind: "done"; id: string }
  | { kind: "statement"; id: string }
  | { kind: "wallet" };

const TABS: { value: Tab; label: string; status?: SavingsGoalStatus }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active", status: "ACTIVE" },
  { value: "PAUSED", label: "Paused", status: "PAUSED" },
  { value: "COMPLETED", label: "Completed", status: "COMPLETED" },
  { value: "WITHDRAWN", label: "Withdrawn", status: "WITHDRAWN" },
];
const EMPTY_TAB: Record<Tab, string> = { ALL: "", ACTIVE: "No active goals right now.", PAUSED: "No paused goals right now.", COMPLETED: "No completed goals right now.", WITHDRAWN: "No withdrawn goals right now." };

// Savings goals (design: SavingsDashboard): how all goals are doing
// together and this month, which are behind their plan, then a card per
// goal; every action opens as a popup over the page.
export function GoalsPageClient({ businessId, goals, overview, currency, canManage, savingsWallets, moneyAccounts, archivedWallets, walletNames, person, today }: GoalsPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [tab, setTab] = useState<Tab>("ALL");
  const [behindOnly, setBehindOnly] = useState(false);
  const [modal, setModal] = useState<Modal | null>(null);
  const [isPending, startTransition] = useTransition();

  // ?new=1 opens New goal (Home's "Add a goal"); ?goal=<id> opens a goal's
  // details (the bell's reminder). Then the URL forgets them.
  const asked = searchParams.get("new") === "1" && canManage ? "new" : searchParams.get("goal");
  const [prevAsked, setPrevAsked] = useState<string | null>(null);
  if (asked !== prevAsked) {
    setPrevAsked(asked);
    if (asked === "new") setModal({ kind: "goal" });
    else if (asked && goals.some((goal) => goal.id === asked)) setModal({ kind: "details", id: asked });
  }
  useEffect(() => {
    if (!searchParams.has("new") && !searchParams.has("goal")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    params.delete("goal");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  const byId = (id: string | undefined) => (id ? (goals.find((goal) => goal.id === id) ?? null) : null);
  const colorOf = (goal: SavingsGoal | null) => (goal ? goalColor(Math.max(0, goals.findIndex((item) => item.id === goal.id)), goal.status) : "var(--emerald)");
  const noWallet = savingsWallets.length === 0;
  const open = goals.filter((goal) => goal.status !== "WITHDRAWN");
  // Somewhere a goal's money can go: another open goal that isn't full.
  const canMoveTo = (goal: SavingsGoal) => goals.some((other) => other.id !== goal.id && other.status !== "WITHDRAWN" && other.status !== "COMPLETED");
  const hero = goalsHero(goals, today);
  const month = formatDate(today, "MMMM", fmt);
  const showBehind = behindOnly && hero.behind > 0;
  const tabGoals = (value: Tab) => {
    const status = TABS.find((item) => item.value === value)?.status;
    return status ? goals.filter((goal) => goal.status === status) : goals;
  };
  const shown = behindFirst(showBehind ? goals.filter(isBehind) : tabGoals(tab));
  const hasRate = Number(overview.savedThisMonth) > 0 && overview.savingsRatePercent > 0;

  const setStatus = (goal: SavingsGoal, status: "ACTIVE" | "PAUSED") => {
    if (isPending) return;
    startTransition(async () => {
      const result = await updateSavingsGoalStatusAction(businessId, goal.id, status);
      if (!result.success) {
        toast.error(savingsError(result.message, "Failed to update goal", t, currency, fmt));
        return;
      }
      toast.success(
        status === "PAUSED"
          ? t("{name} is paused. No monthly target until you resume it.", { name: goal.name })
          : t("{name} is back on with a fresh plan. Save {amount} a month to finish by {date}.", { name: goal.name, amount: money(monthlyFromNow(goal, today)), date: formatDate(goal.targetDate, "d MMM yyyy", fmt) }),
      );
      router.refresh();
    });
  };

  async function remove(goal: SavingsGoal) {
    const ok = await confirm({
      title: t("Delete {name}?", { name: goal.name }),
      message: Number(goal.currentAmount) > 0 ? t("The goal and its history are removed. The {amount} stays in your savings accounts, it just stops counting toward a goal.", { amount: money(goal.currentAmount) }) : t("The goal and its history are removed. This can't be undone."),
      confirmLabel: "Delete goal",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteSavingsGoalAction(businessId, goal.id);
      if (!result.success) {
        toast.error(savingsError(result.message, "Failed to delete goal", t, currency, fmt));
        return;
      }
      toast.success(t("{name} was deleted.", { name: goal.name }));
      setModal(null);
      router.refresh();
    });
  }

  function act(goal: SavingsGoal, action: GoalAction | "statement") {
    switch (action) {
      case "details":
        return setModal({ kind: "details", id: goal.id });
      case "catch":
        return setModal({ kind: "catch", id: goal.id });
      case "edit":
        return setModal({ kind: "goal", id: goal.id });
      case "pause":
        return setStatus(goal, "PAUSED");
      case "resume":
        return setStatus(goal, "ACTIVE");
      case "move":
        return setModal({ kind: "move", setup: { fromId: goal.id, pickFrom: false } });
      case "withdraw":
        return setModal({ kind: "withdraw", id: goal.id });
      case "delete":
        return void remove(goal);
      case "add":
        return setModal({ kind: "add", id: goal.id });
      case "wallet":
        return setModal({ kind: "wallet" });
      case "statement":
        return setModal({ kind: "statement", id: goal.id });
    }
  }

  function moveAny() {
    const funded = open.find((goal) => Number(goal.currentAmount) > 0);
    if (!funded) {
      toast.info(t("Add money to a goal first. Then you can move it to another goal."));
      return;
    }
    setModal({ kind: "move", setup: { fromId: funded.id, pickFrom: true } });
  }

  const current = modal && "id" in modal ? byId(modal.id) : null;
  const close = () => setModal(null);

  const setupBanner = () => {
    if (archivedWallets.length > 0) {
      const one = archivedWallets.length === 1;
      return (
        <Banner
          title={one ? t("Your savings account is archived") : t("Your savings accounts are archived")}
          text={!canManage ? (one ? t("Ask the workspace owner to restore it.") : t("Ask the workspace owner to restore one of them.")) : one ? t("Restore it to add money to your goals or withdraw from them again.") : t("Restore one to add money to your goals or withdraw from them again.")}
          action={
            canManage && (
              <>
                {one ? (
                  <RestoreWalletButton businessId={businessId} walletId={archivedWallets[0].id} walletName={archivedWallets[0].name} appearance="button" />
                ) : (
                  <Button variant="action" size="lg" asChild>
                    <Link href="/savings-goals/wallet?archived=1">{t("See archived accounts")}</Link>
                  </Button>
                )}
                <Button variant="secondary" size="lg" onClick={() => setModal({ kind: "wallet" })}>
                  {t("Add savings account")}
                </Button>
              </>
            )
          }
        />
      );
    }
    return (
      <Banner
        title={t("One step before you can save: add a savings account")}
        text={canManage ? t("A savings account is where your saved money actually sits, for example a DPS or FDR account. Add one, then you can start adding money to your goals.") : t("A savings account is where your saved money actually sits, for example a DPS or FDR account. Ask the workspace owner to add one.")}
        action={
          canManage && (
            <Button variant="action" size="lg" onClick={() => setModal({ kind: "wallet" })}>
              {t("Add savings account")}
            </Button>
          )
        }
      />
    );
  };

  return (
    <PageFrame className="gap-5">
      <PageHeader
        title={t("Savings goals")}
        description={t("Put money aside for what matters, and watch each goal fill up.")}
        actions={
          canManage && (
            <>
              {goals.length > 0 && (
                <Button variant="secondary" onClick={moveAny}>
                  <ArrowLeftRight className="text-ink-2" />
                  {t("Move between goals")}
                </Button>
              )}
              <Button onClick={() => setModal({ kind: "goal" })}>
                <Plus strokeWidth={2.5} className="size-4" />
                {t("New goal")}
              </Button>
            </>
          )
        }
      />

      {noWallet && setupBanner()}

      {goals.length === 0 ? (
        <EmptyState
          icon={<PiggyBank />}
          title={t("No savings goal yet")}
          description={t("Emergency fund, Hajj, a new bike… name it, set a target, and start putting money aside.")}
          action={canManage && <Button onClick={() => setModal({ kind: "goal" })}>{t("New goal")}</Button>}
          className="min-h-80"
        />
      ) : (
        <>
          <Card padding="none" className="grid md:grid-cols-[1.3fr_1fr_0.8fr]">
            <div className="flex items-center gap-5 px-6 py-5">
              <GoalRing percent={hero.percent} color="var(--emerald)" size={112} label={t("{percent}% of all goals saved", { percent: formatCount(hero.percent, fmt) })}>
                <span className="text-[22px] leading-[normal] font-bold">{formatCount(hero.percent, fmt)}%</span>
                <span className="text-[11px] font-normal text-ink-muted">{t("of all goals")}</span>
              </GoalRing>
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-small font-medium text-ink-muted">{t("Saved so far")}</span>
                <span className="text-[28px] leading-[normal] font-bold tracking-[-0.02em] text-ink tabular-nums">{money(hero.saved)}</span>
                <span className="text-small text-pretty text-ink-muted tabular-nums">
                  {fillNodes(t("of {total} · {left} to go"), { total: money(hero.target), left: <span className="font-semibold text-ink-2">{money(hero.toGo)}</span> })}
                </span>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-2.5 border-t border-line px-6 py-5 md:border-t-0 md:border-l">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-small font-medium text-ink-muted">{t("Saved this month")}</span>
                <span className="text-caption font-semibold text-ink-2">{t("{percent}% of target", { percent: formatCount(hero.monthPercent, fmt) })}</span>
              </div>
              <span className="text-body font-medium text-ink-muted tabular-nums">
                {fillNodes(t("{saved} of {target}"), { saved: <span className="text-[22px] leading-[normal] font-bold text-ink">{money(hero.monthSaved)}</span>, target: money(hero.monthTarget) })}
              </span>
              <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                <span className="block h-full rounded-full bg-emerald" style={{ width: `${hero.monthPercent}%` }} />
              </span>
              <span className="text-caption text-ink-muted">
                {hero.active ? t(hero.active === 1 ? "{got} of {count} active goal got money in {month}" : "{got} of {count} active goals got money in {month}", { got: formatCount(hero.gotMoney, fmt), count: formatCount(hero.active, fmt), month }) : t("No active goals yet")}
                {hasRate && ` · ${t("savings rate {percent}% of income", { percent: formatCount(overview.savingsRatePercent, fmt) })}`}
              </span>
            </div>
            <div className="flex flex-col justify-center gap-1.5 border-t border-line px-6 py-5 md:border-t-0 md:border-l">
              <span className="text-small font-medium text-ink-muted">{t("On pace")}</span>
              <span className="text-[28px] leading-[normal] font-bold tracking-[-0.02em] text-ink">
                {hero.active ? formatCount(hero.active - hero.behind, fmt) : "—"} {hero.active > 0 && <span className="text-body font-medium text-ink-muted">{t("of {count} active", { count: formatCount(hero.active, fmt) })}</span>}
              </span>
              {hero.behind > 0 ? (
                <button type="button" onClick={() => setBehindOnly(true)} className="inline-flex min-h-7 items-center gap-1 self-start text-caption font-semibold text-warning underline underline-offset-3 pointer-coarse:min-h-11">
                  {t(hero.behind === 1 ? "{count} goal is behind plan" : "{count} goals are behind plan", { count: formatCount(hero.behind, fmt) })}
                  <ArrowRight className="size-3" strokeWidth={2.5} aria-hidden="true" />
                </button>
              ) : (
                <span className="text-caption font-medium text-income">{hero.active ? t("Every active goal is on plan") : t("No active goals yet")}</span>
              )}
            </div>
          </Card>

          <TabBar
            options={TABS.map((item) => ({ value: item.value, label: t(item.label), count: tabGoals(item.value).length }))}
            value={showBehind ? ("" as Tab) : tab}
            onChange={(value) => {
              setTab(value);
              setBehindOnly(false);
            }}
            label={t("Goal status")}
            className="max-md:overflow-x-auto"
          />

          {showBehind && (
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-warning-soft px-4 py-2.5 text-[13.5px] text-warning-ink">
              <span className="min-w-0 flex-1">
                <b>{hero.behind === 1 ? t("Showing the 1 goal behind plan.") : t("Showing {count} goals behind plan.", { count: formatCount(hero.behind, fmt) })}</b> {t("Catch up on a card to see your options.")}
              </span>
              <button type="button" onClick={() => setBehindOnly(false)} className="h-8.5 rounded-full border border-warning bg-surface px-3.5 text-[13px] font-semibold text-warning-ink pointer-coarse:h-11">
                {t("Show all goals")}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {shown.map((goal) => (
              <GoalCard key={goal.id} goal={goal} color={colorOf(goal)} currency={currency} today={today} canManage={canManage} noWallet={noWallet} canMoveTo={canMoveTo(goal)} busy={isPending} onAction={(action) => act(goal, action)} />
            ))}
            {canManage && tab === "ALL" && !showBehind && shown.length % 2 === 1 && (
              <button
                type="button"
                onClick={() => setModal({ kind: "goal" })}
                className="flex min-h-37.5 flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-input bg-surface transition-colors hover:border-emerald max-lg:hidden"
              >
                <span className="flex size-10 items-center justify-center rounded-field bg-mint-50 text-emerald">
                  <Plus className="size-4.5" strokeWidth={2.5} aria-hidden="true" />
                </span>
                <span className="text-body font-semibold text-ink">{t("New goal")}</span>
                <span className="text-caption text-ink-muted">{t("Emergency fund, Hajj, a new bike…")}</span>
              </button>
            )}
          </div>
          {shown.length === 0 && !showBehind && tab !== "ALL" && <p className="rounded-lg border border-line bg-surface p-9 text-center text-body text-ink-muted">{t(EMPTY_TAB[tab])}</p>}
        </>
      )}

      <GoalFormDialog
        open={modal?.kind === "goal"}
        onClose={close}
        businessId={businessId}
        editing={modal?.kind === "goal" ? byId(modal.id) : null}
        currency={currency}
        today={today}
        email={person.email}
        wallets={savingsWallets}
        onAddWallet={() => setModal({ kind: "wallet" })}
      />
      <AddMoneyDialog
        open={modal?.kind === "add"}
        onClose={close}
        businessId={businessId}
        goal={modal?.kind === "add" ? current : null}
        color={colorOf(current)}
        currency={currency}
        today={today}
        moneyAccounts={moneyAccounts}
        savingsWallets={savingsWallets}
        startAmount={modal?.kind === "add" ? modal.amount : undefined}
        onReached={(id) => setModal({ kind: "done", id })}
      />
      <GoalDetailsDialog
        open={modal?.kind === "details"}
        onClose={close}
        businessId={businessId}
        goal={modal?.kind === "details" ? current : null}
        color={colorOf(current)}
        currency={currency}
        today={today}
        canManage={canManage}
        noWallet={noWallet}
        canMoveTo={current ? canMoveTo(current) : false}
        busy={isPending}
        onAction={(action) => current && act(current, action)}
      />
      <WithdrawDialog open={modal?.kind === "withdraw"} onClose={close} businessId={businessId} goal={modal?.kind === "withdraw" ? current : null} currency={currency} today={today} moneyAccounts={moneyAccounts} />
      <CatchUpDialog
        open={modal?.kind === "catch"}
        onClose={close}
        businessId={businessId}
        goal={modal?.kind === "catch" ? current : null}
        currency={currency}
        today={today}
        email={person.email}
        canAdd={!noWallet}
        onAddNow={(amount) => current && setModal({ kind: "add", id: current.id, amount })}
        onMoveIn={() => {
          if (!current) return;
          const from = open.find((goal) => goal.id !== current.id && Number(goal.currentAmount) > 0);
          if (!from) {
            toast.info(t("No other goal has money to move yet."));
            return;
          }
          setModal({ kind: "move", setup: { fromId: from.id, pickFrom: true, toId: current.id } });
        }}
      />
      <MoveMoneyDialog open={modal?.kind === "move"} onClose={close} businessId={businessId} goals={goals} setup={modal?.kind === "move" ? modal.setup : null} currency={currency} today={today} onReached={(id) => setModal({ kind: "done", id })} />
      <GoalReachedDialog open={modal?.kind === "done"} onClose={close} goal={modal?.kind === "done" ? current : null} currency={currency} today={today} canWithdraw={canManage} onWithdraw={() => current && setModal({ kind: "withdraw", id: current.id })} />
      <GoalStatementDialog
        open={modal?.kind === "statement"}
        onClose={close}
        onBack={() => current && setModal({ kind: "details", id: current.id })}
        businessId={businessId}
        goal={modal?.kind === "statement" ? current : null}
        currency={currency}
        person={person}
      />
      <SavingsAccountDialog open={modal?.kind === "wallet"} onClose={close} businessId={businessId} editing={null} names={walletNames} addedNote="goals" />
      {confirmDialog}
    </PageFrame>
  );
}

// The note above the goals while money can't go in yet.
function Banner({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <section className={cn("flex flex-col gap-4 rounded-[14px] border border-emerald-line bg-mint-50 p-5 md:flex-row md:items-center md:gap-5 md:px-6")}>
      <span className="flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-surface text-emerald shadow-[0_4px_12px_rgba(14,26,22,0.08)]">
        <PiggyBank className="size-6.5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="text-[17px] leading-[normal] font-semibold text-ink">{title}</h2>
        <p className="max-w-170 text-body leading-[1.55] text-ink-2">{text}</p>
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-3">{action}</div>}
    </section>
  );
}
