"use client";

import { EyeOff, Lock, Trash2, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useStoredChoice } from "@/components/modules/Customer/Balance/useStoredChoice";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import Input from "@/components/smartly/form/Input";
import PageFrame from "@/components/smartly/PageFrame";
import type { GroupActivityAction, GroupContribution, GroupExpense, GroupExpenseCategoryOption, GroupMember } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { deleteBusinessAction } from "@/lib/customer/businessActions";
import { formatCurrency } from "@/lib/customer/currency";
import { budgetFor, budgetStatus, cashInHand, groupMonthOf, groupTabHref, type GroupTab, isDayClosed, poolsMeals, sharedEqually, shiftMonth, shortName, spendByCategory, spendByMonth, startDayOf, type Transfer, whoPaysWhom } from "@/lib/customer/groupDisplay";
import { deleteGroupContributionAction, deleteGroupExpenseAction, deleteGroupExpenseCategoryAction, updateGroupExpenseCategoryAction, updateGroupMemberAction } from "@/lib/customer/groupExpensesActions";
import { budgetPageMonths, costShares, firstMonthOf, mainAccountantId, monthEndOf, spendByMonthKey } from "@/lib/customer/groupFamily";
import { unitsOf } from "@/lib/customer/groupMeals";
import { type GroupPeriod, periodQuery } from "@/lib/customer/groupPeriod";
import { monthName } from "@/lib/customer/insights";
import { formatDay } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CloseMonthDialog } from "./CloseMonthDialog";
import { ContributionDrawer, dayInMonth } from "./ContributionDrawer";
import { CostSplitDialog } from "./CostSplitDialog";
import { ExpenseDrawer } from "./ExpenseDrawer";
import { FamilyDashboard } from "./FamilyDashboard";
import { FamilySettlementTab } from "./FamilySettlementTab";
import { GroupActivityTab } from "./GroupActivityTab";
import { GroupBudgetTab } from "./GroupBudgetTab";
import { GroupCashbookTab } from "./GroupCashbookTab";
import { GroupCategoriesTab } from "./GroupCategoriesTab";
import { GroupCategoryDialog } from "./GroupCategoryDialog";
import { GroupContributionsTab } from "./GroupContributionsTab";
import { GroupDialog } from "./GroupDialog";
import { GroupExpensesTab } from "./GroupExpensesTab";
import { GroupHeader } from "./GroupHeader";
import { GroupMealsTab } from "./GroupMealsTab";
import { GroupMembersTab } from "./GroupMembersTab";
import { GroupMonthPicker } from "./GroupMonthPicker";
import { useTellGroupNav } from "./groupNav";
import { GroupSettingsTab } from "./GroupSettingsTab";
import { GroupSetup } from "./GroupSetup";
import type { ClosedGuard, GroupPageData, GroupView } from "./groupTypes";
import { MealDrawer } from "./MealDrawer";
import { MemberDrawer } from "./MemberDrawer";
import { MemberStatementDrawer } from "./MemberStatementDrawer";
import { MessDashboard } from "./MessDashboard";
import { MessSettlementTab } from "./MessSettlementTab";
import { MonthBudgetDialog } from "./MonthBudgetDialog";
import { RecordPaymentDialog } from "./RecordPaymentDialog";

interface Confirm {
  title: string;
  description: string;
  confirmLabel: string;
  danger: boolean;
  icon?: React.ReactNode;
  onConfirm: () => void;
}

// A group: its header, one page at a time (the sidebar's), and every popup
// the pages open. Figures are derived here once, from what the server page
// loaded. A mess, or a family counting meals, keeps the meal-rate dashboard
// and settlement; a family gets the v7 pages.
export function GroupPageClient({ data }: { data: GroupPageData }) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Another period or month re-renders the page on the server; the page
  // dims meanwhile, so a tap on a slow line doesn't look ignored.
  const [moving, startMoving] = useTransition();
  const [member, setMember] = useState<{ open: boolean; editing: GroupMember | null }>({ open: false, editing: null });
  const [contribution, setContribution] = useState<{ open: boolean; editing: GroupContribution | null; memberId: string | null }>({ open: false, editing: null, memberId: null });
  const [expense, setExpense] = useState<{ open: boolean; editing: GroupExpense | null }>({ open: false, editing: null });
  const [payment, setPayment] = useState<{ open: boolean; preset: Transfer | null }>({ open: false, preset: null });
  const [statement, setStatement] = useState<GroupMember | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [budgetKey, setBudgetKey] = useState<string | null>(null);
  const [category, setCategory] = useState<{ open: boolean; editing: GroupExpenseCategoryOption | null }>({ open: false, editing: null });
  const [splitOpen, setSplitOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [typed, setTyped] = useState("");
  // The day the meal drawer shows; null when it is shut.
  const [mealDay, setMealDay] = useState<string | null>(null);
  // The answer a closed-month question is waiting for: false when the
  // dialog is shut without going ahead.
  const pendingAsk = useRef<((ok: boolean) => void) | null>(null);

  // Every kind shares the v16 dashboard; only a group that counts meals
  // keeps the meal-rate pages, since its money is worked out from them.
  const messLayout = data.settings.mealsOn;
  // Skip, go to dashboard: a new group shows its dashboard from then on.
  const [setupSeen, setSetupSeen] = useStoredChoice<"open" | "skipped">(`smartly-group-setup:${data.businessId}`, ["open", "skipped"], "open");
  useTellGroupNav(data.businessId, messLayout);

  const view = useMemo<GroupView>(() => {
    const activeMembers = data.members.filter((m) => m.status === "ACTIVE");
    const months = Array.from({ length: 6 }, (_, i) => shiftMonth(data.range.key, i - 5));
    const monthBudget = budgetFor(data.budgets, data.range);
    const mealsPooled = poolsMeals(data.settings.mealsOn, data.settlement);
    return {
      activeMembers,
      memberById: Object.fromEntries(data.members.map((m) => [m.id, m])),
      balances: Object.fromEntries(data.settlement.members.map((row) => [row.groupMemberId, Number(row.balance)])),
      cash: cashInHand(data.settlement),
      transfers: whoPaysWhom(data.settlement.members),
      budget: monthBudget ? budgetStatus(Number(monthBudget.budgetAmount), Number(data.settlement.totalExpense)) : null,
      byCategory: spendByCategory(data.expenses),
      // By the group's own months, as its budgets are.
      byMonth: spendByMonth(data.recentExpenses, months, startDayOf(data.range)),
      closed: data.closedRecord !== null,
      setup: data.isNew && setupSeen !== "skipped",
      empty: data.contributions.length === 0 && data.expenses.length === 0 && data.meals.length === 0,
      mealsPooled,
      sharedEqually: sharedEqually(data.expenses, mealsPooled, data.members, data.range),
    };
  }, [data, setupSeen]);

  const monthLabel = monthName(data.range.key, fmt, "long", true);
  const offline = t(OFFLINE_MESSAGE), stale = t(STALE_MESSAGE);
  const holderId = mainAccountantId(data.settings, data.members);
  const canAdd = !data.settings.pausedAt;
  const givenByMember = data.contributions.filter((row) => row.kind === "DEPOSIT").reduce<Record<string, number>>((sum, row) => ({ ...sum, [row.groupMemberId]: (sum[row.groupMemberId] ?? 0) + Number(row.amount) }), {});
  const accountantCash = Object.fromEntries((data.settlement.accountantCash ?? []).map((row) => [row.groupMemberId, Number(row.cash)]));
  const money = (value: number | string) => formatCurrency(value, data.currency, fmt);

  // Moving within the group: another page, period, month or filter.
  function go(tab: GroupTab, query: Record<string, string> = {}) {
    startMoving(() => router.push(groupTabHref(data.businessId, tab, query)));
  }
  const onPeriod = (period: GroupPeriod) => go(data.tab, { ...periodQuery(period), ...(data.tab === "cashbook" && data.cashbookAccountant && { accountant: data.cashbookAccountant }) });
  const currentPeriod = () => (data.period ? periodQuery(data.period) : {});

  function closeConfirm() {
    if (isPending) return;
    pendingAsk.current?.(false);
    pendingAsk.current = null;
    setConfirm(null);
  }

  // A day inside a closed month: the record won't change, so ask before an
  // entry is saved or edited there. Resolves at once for an open day.
  const askClosed = (day: string, title = t("This date is in a closed month")): Promise<boolean> =>
    new Promise((resolve) => {
      if (!isDayClosed(data.history, day)) return resolve(true);
      pendingAsk.current = resolve;
      setConfirm({
        title,
        description: t("The closed record keeps its figures whatever you change here. Only the live numbers move. Go ahead?"),
        confirmLabel: t("Go ahead"),
        danger: false,
        icon: <Lock />,
        onConfirm: () => {
          pendingAsk.current = null;
          setConfirm(null);
          resolve(true);
        },
      });
    });
  const closedGuard: ClosedGuard = { isClosed: (day) => isDayClosed(data.history, day), ask: (day) => askClosed(day) };
  const guardEdit = (date: string, proceed: () => void) => void askClosed(date, t("This entry is in a closed month")).then((ok) => ok && proceed());

  function run(action: () => Promise<{ success: boolean; message?: string }>, done: string, failed: string) {
    startTransition(async () => {
      const result = await attempt(action, offline, stale);
      if (result.success) {
        toast.success(done);
        setConfirm(null);
        router.refresh();
      } else {
        toast.error(result.message ?? failed);
      }
    });
  }

  // A delete is asked once: the closed-month warning joins its confirm.
  const closedNote = (date: string) => (isDayClosed(data.history, date) ? ` ${t("It is dated in a closed month: the closed record keeps its figures, and only the live numbers move.")}` : "");

  const removeContribution = (row: GroupContribution) =>
    setConfirm({
      title: t("Delete this contribution?"),
      description: `${row.groupMember?.name ?? ""} · ${formatDay(row.date.slice(0, 10), "d MMM yyyy", fmt)} · ${money(Math.abs(Number(row.amount)))}. ${t("The month's balances move the moment it is gone.")}${closedNote(row.date)}`,
      confirmLabel: t("Delete"),
      danger: true,
      onConfirm: () => run(() => deleteGroupContributionAction(data.businessId, row.id), t("Contribution deleted"), t("Failed to delete the contribution")),
    });

  const removeExpense = (row: GroupExpense) =>
    setConfirm({
      title: t("Delete this expense?"),
      description: `${[formatDay(row.date.slice(0, 10), "d MMM yyyy", fmt), row.description || row.category, money(row.amount)].join(" · ")}. ${t("This cannot be undone.")}${closedNote(row.date)}`,
      confirmLabel: t("Delete"),
      danger: true,
      onConfirm: () => run(() => deleteGroupExpenseAction(data.businessId, row.id), t("Expense deleted"), t("Failed to delete the expense")),
    });

  // Inactive from the end of this group month: they share its costs up to
  // then, and none after. Making someone active again needs no question.
  const toggleMember = (target: GroupMember) => {
    if (target.status !== "ACTIVE") {
      run(() => updateGroupMemberAction(data.businessId, target.id, { status: "ACTIVE" }), t("Member made active"), t("Failed to update member"));
      return;
    }
    const share = costShares(data.members, data.settings)[target.id];
    setConfirm({
      title: t("Mark {name} inactive?", { name: target.name }),
      description: t("{name} stays in every past record and month. From next month, new expenses won't include them and their {percent} is shared among the others.", { name: target.name, percent: share !== undefined ? `${formatCount(Math.round(share * 10) / 10, fmt)}%` : t("share") }),
      confirmLabel: t("Mark inactive"),
      danger: false,
      icon: <UserMinus />,
      onConfirm: () => run(() => updateGroupMemberAction(data.businessId, target.id, { status: "ARCHIVED", leftOn: monthEndOf(data.today, data.startDay) }), t("Member marked inactive"), t("Failed to update member")),
    });
  };

  const hideCategory = (target: GroupExpenseCategoryOption, hidden: boolean) =>
    run(() => updateGroupExpenseCategoryAction(data.businessId, target.id, { hidden }), hidden ? t("{name} is hidden", { name: target.name }) : t("{name} is shown again", { name: target.name }), t("Failed to update category"));

  // A category with expenses can only be hidden; one never used is deleted.
  const removeCategory = (target: GroupExpenseCategoryOption) =>
    (target.expenseCount ?? 0) > 0
      ? setConfirm({
          title: t("Hide {name}?", { name: target.name }),
          description: t("{name} has expenses, so it can't be deleted. Hidden, it stays in old records and isn't offered for new expenses.", { name: target.name }),
          confirmLabel: t("Hide"),
          danger: false,
          icon: <EyeOff />,
          onConfirm: () => hideCategory(target, true),
        })
      : setConfirm({
          title: t("Delete {name}?", { name: target.name }),
          description: t("It isn't used by any expense, so nothing else changes."),
          confirmLabel: t("Delete"),
          danger: true,
          onConfirm: () => run(() => deleteGroupExpenseCategoryAction(data.businessId, target.id), t("Category deleted"), t("Failed to delete category")),
        });

  function deleteGroup() {
    if (typed.trim() !== data.name.trim()) return;
    startTransition(async () => {
      const result = await attempt(() => deleteBusinessAction(data.businessId), offline, stale);
      if (result.success) {
        toast.success(t("Group deleted"));
        router.push("/group-expenses");
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to delete the group"));
      }
    });
  }

  const openContribution = (memberId: string | null = null) => setContribution({ open: true, editing: null, memberId });
  const openExpense = () => setExpense({ open: true, editing: null });
  // A payment is dated inside the month on show: ask first if that day is closed.
  const openPayment = (preset: Transfer | null) => void askClosed(dayInMonth(data.range, data.today)).then((ok) => ok && setPayment({ open: true, preset }));

  // The budget popup's months and what each spent.
  const currentKey = groupMonthOf(data.today, data.startDay);
  const budgetExpenses = data.allExpenses ?? data.recentExpenses;
  const budgetChoices = budgetPageMonths(currentKey, data.allExpenses ? firstMonthOf(currentKey, data.members, data.budgets, data.allExpenses, data.startDay) : shiftMonth(currentKey, -11));

  const pages: Record<GroupTab, React.ReactNode> = {
    dashboard: view.setup ? (
      <GroupSetup data={data} view={view} onAddMember={() => setMember({ open: true, editing: null })} onAddContribution={() => openContribution()} onSkip={() => setSetupSeen("skipped")} />
    ) : messLayout ? (
      <MessDashboard data={data} view={view} onRecordPayment={openPayment} onStatement={setStatement} onSetBudget={() => setBudgetKey(data.range.key)} />
    ) : (
      <FamilyDashboard data={data} view={view} canAdd={canAdd} onAddExpense={openExpense} onAddContribution={() => openContribution()} onRecordPayment={openPayment} onStatement={setStatement} />
    ),
    contributions: (
      <GroupContributionsTab
        data={data}
        view={view}
        onAdd={(memberId) => openContribution(memberId ?? null)}
        onEdit={(row) => guardEdit(row.date, () => setContribution({ open: true, editing: row, memberId: null }))}
        onRemove={removeContribution}
        onEditExpense={(row) => guardEdit(row.date, () => setExpense({ open: true, editing: row }))}
        onRemoveExpense={removeExpense}
        canAdd={canAdd}
      />
    ),
    expenses: <GroupExpensesTab data={data} view={view} onAdd={openExpense} onEdit={(row) => guardEdit(row.date, () => setExpense({ open: true, editing: row }))} onRemove={removeExpense} canAdd={canAdd} />,
    cashbook: <GroupCashbookTab data={data} view={view} onAccountant={(id) => go("cashbook", { month: data.range.key, ...(id && { accountant: id }) })} busy={moving} canAdd={canAdd} />,
    settlement: messLayout ? (
      <MessSettlementTab data={data} view={view} onRecordPayment={openPayment} onCloseMonth={() => setCloseOpen(true)} />
    ) : (
      <FamilySettlementTab data={data} view={view} onRecordPayment={() => openPayment(null)} />
    ),
    members: <GroupMembersTab data={data} view={view} onAdd={() => setMember({ open: true, editing: null })} onEdit={(target) => setMember({ open: true, editing: target })} onToggleStatus={toggleMember} />,
    categories: <GroupCategoriesTab data={data} onAdd={() => setCategory({ open: true, editing: null })} onEdit={(editing) => setCategory({ open: true, editing })} onHide={hideCategory} onDelete={removeCategory} />,
    budget: <GroupBudgetTab data={data} onSet={setBudgetKey} />,
    meals: <GroupMealsTab data={data} onDay={setMealDay} closedGuard={closedGuard} />,
    activity: <GroupActivityTab data={data} onKind={(action: GroupActivityAction | null) => go("activity", action ? { action } : {})} onPage={(page) => go("activity", { ...(data.activityAction && { action: data.activityAction }), page: String(page) })} busy={moving} />,
    settings: <GroupSettingsTab data={data} onCostSplit={() => setSplitOpen(true)} onEditCategory={(editing) => setCategory({ open: true, editing })} onRemoveCategory={removeCategory} onDeleteGroup={() => setDeleting(true)} />,
  };

  return (
    <PageFrame className="gap-5">
      <GroupHeader businessId={data.businessId} name={data.name} settings={data.settings} tab={data.tab} memberCount={view.activeMembers.length} role={data.role} groups={data.groups}
        period={
          (data.tab === "dashboard" && !view.setup) || data.tab === "contributions" || data.tab === "expenses" || data.tab === "settlement" || data.tab === "cashbook" ? (
            <GroupMonthPicker name={data.name} currency={data.currency} value={data.range.key} current={currentKey} months={data.months} startDay={data.startDay} history={data.history} spent={data.monthTotals} onPick={(key) => go(data.tab, { month: key })} busy={moving} />
          ) : undefined
        }
      />
      <div aria-busy={moving || undefined} className={cn("flex flex-col transition-opacity motion-reduce:transition-none", moving && "pointer-events-none opacity-60")}>
        {pages[data.tab]}
      </div>

      <MealDrawer day={mealDay} onClose={() => setMealDay(null)} businessId={data.businessId} members={data.members} meals={data.meals} units={unitsOf(data.settings)} range={data.range} closedGuard={closedGuard} />
      <MemberDrawer open={member.open} onClose={() => setMember({ open: false, editing: null })} businessId={data.businessId} members={data.members} editing={member.editing} defaultJoin={view.setup ? "" : data.today} />
      <ContributionDrawer open={contribution.open} onClose={() => setContribution({ open: false, editing: null, memberId: null })} businessId={data.businessId} currency={data.currency} members={data.members} balances={view.balances} holderId={holderId} given={givenByMember} range={data.range} today={data.today} editing={contribution.editing} presetMemberId={contribution.memberId} closedGuard={closedGuard} />
      <ExpenseDrawer
        open={expense.open}
        onClose={() => setExpense({ open: false, editing: null })}
        businessId={data.businessId}
        currency={data.currency}
        members={data.members}
        categories={data.categories}
        accountantCash={accountantCash}
        cashInHand={view.cash}
        holderId={holderId}
        costSplit={data.settings.costSplit ?? "EQUAL"}
        range={data.range}
        today={data.today}
        editing={expense.editing}
        meals={messLayout}
        mealsOn={data.settings.mealsOn}
        closedGuard={closedGuard}
      />
      <RecordPaymentDialog open={payment.open} onClose={() => setPayment({ open: false, preset: null })} businessId={data.businessId} currency={data.currency} members={data.members} balances={view.balances} cashInHand={view.cash} range={data.range} today={data.today} preset={payment.preset} />
      <MemberStatementDrawer
        open={statement !== null}
        onClose={() => setStatement(null)}
        data={data}
        view={view}
        member={statement}
        onRecordPayment={() => {
          const transfer = statement ? (view.transfers.find((tr) => tr.fromId === statement.id || tr.toId === statement.id) ?? null) : null;
          setStatement(null);
          openPayment(transfer);
        }}
      />
      <CloseMonthDialog open={closeOpen} onClose={() => setCloseOpen(false)} businessId={data.businessId} currency={data.currency} range={data.range} today={data.today} settlement={data.settlement} sharedEqually={view.sharedEqually} mess={data.settings.kind === "MESS"} holderName={holderId ? shortName(view.memberById[holderId]?.name) : undefined} />
      <MonthBudgetDialog open={budgetKey !== null} onClose={() => setBudgetKey(null)} businessId={data.businessId} currency={data.currency} budgets={data.budgets} monthKey={budgetKey ?? currentKey} choices={budgetChoices} spent={spendByMonthKey(budgetExpenses, data.startDay)} />
      <GroupCategoryDialog open={category.open} onClose={() => setCategory({ open: false, editing: null })} businessId={data.businessId} categories={data.categories} editing={category.editing} />
      <CostSplitDialog open={splitOpen} onClose={() => setSplitOpen(false)} businessId={data.businessId} currency={data.currency} members={data.members} mode={data.settings.costSplit ?? "EQUAL"} monthKey={currentKey} spent={Number(data.settlement.totalExpense)} />
      <GroupDialog
        open={deleting}
        onClose={() => {
          setDeleting(false);
          setTyped("");
        }}
        busy={isPending}
        width={460}
        title={t("Delete {name}?", { name: data.name })}
        sub={t("Every expense, contribution and closed month in this group will be removed. Type the group name to confirm.")}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDeleting(false);
                setTyped("");
              }}
              disabled={isPending}
            >
              {t("Cancel")}
            </Button>
            <Button type="button" variant="danger" onClick={deleteGroup} disabled={isPending || typed.trim() !== data.name.trim()}>
              {isPending && <Loader />}
              {t("Delete group")}
            </Button>
          </>
        }
      >
        <Input size="md" value={typed} onChange={(event) => setTyped(event.target.value)} placeholder={data.name} aria-label={t("Type the group name")} autoFocus />
      </GroupDialog>
      <ConfirmDialog
        open={confirm !== null}
        onClose={closeConfirm}
        onConfirm={() => confirm?.onConfirm()}
        icon={confirm?.icon ?? (confirm?.danger ? <Trash2 /> : <Lock />)}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        confirmLabel={confirm?.confirmLabel ?? ""}
        danger={confirm?.danger ?? true}
        isPending={isPending}
      />
      <span className="sr-only" aria-live="polite">
        {moving ? t("Loading {month}", { month: monthLabel }) : ""}
      </span>
    </PageFrame>
  );
}
