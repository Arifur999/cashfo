"use client";

import { Lock, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { CategoryDrawer } from "@/components/modules/Customer/Budget/CategoryDrawer";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import PageFrame from "@/components/smartly/PageFrame";
import type { GroupContribution, GroupExpense, GroupExpenseCategoryOption, GroupMember, GroupMonthlyBudget } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { deleteBusinessAction } from "@/lib/customer/businessActions";
import { budgetFor, budgetStatus, cashInHand, isDayClosed, poolsMeals, sharedEqually, shiftMonth, spendByCategory, spendByMonth, startDayOf, type Transfer, whoPaysWhom } from "@/lib/customer/groupDisplay";
import { unitsOf } from "@/lib/customer/groupMeals";
import { deleteGroupContributionAction, deleteGroupExpenseAction, deleteGroupExpenseCategoryAction, deleteGroupMemberAction, updateGroupMemberAction } from "@/lib/customer/groupExpensesActions";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CloseMonthDialog } from "./CloseMonthDialog";
import { ContributionDrawer, dayInMonth } from "./ContributionDrawer";
import { ExpenseDrawer } from "./ExpenseDrawer";
import { GroupContributionsTab } from "./GroupContributionsTab";
import { GroupDashboard } from "./GroupDashboard";
import { GroupExpensesTab } from "./GroupExpensesTab";
import { GroupHeader } from "./GroupHeader";
import { GroupMealsTab } from "./GroupMealsTab";
import { GroupMembersTab } from "./GroupMembersTab";
import { GroupSettingsTab } from "./GroupSettingsTab";
import { GroupSettlementTab } from "./GroupSettlementTab";
import { GroupSetup } from "./GroupSetup";
import type { ClosedGuard, GroupPageData, GroupView } from "./groupTypes";
import { MealDrawer } from "./MealDrawer";
import { MemberDrawer } from "./MemberDrawer";
import { MemberStatementDrawer } from "./MemberStatementDrawer";
import { MonthBudgetDialog } from "./MonthBudgetDialog";
import { RecordPaymentDialog } from "./RecordPaymentDialog";

interface Confirm {
  title: string;
  description: string;
  confirmLabel: string;
  danger: boolean;
  onConfirm: () => void;
}

// A group: the header with the month, one tab at a time, and every drawer
// and dialog the tabs open. Figures are derived here once, from what the
// server page loaded.
export function GroupPageClient({ data }: { data: GroupPageData }) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Another month re-renders the page on the server; the tab dims
  // meanwhile, so a tap on a slow line doesn't look ignored.
  const [moving, startMoving] = useTransition();
  const [member, setMember] = useState<{ open: boolean; editing: GroupMember | null }>({ open: false, editing: null });
  const [contribution, setContribution] = useState<{ open: boolean; editing: GroupContribution | null; memberId: string | null }>({ open: false, editing: null, memberId: null });
  const [expense, setExpense] = useState<{ open: boolean; editing: GroupExpense | null }>({ open: false, editing: null });
  const [payment, setPayment] = useState<{ open: boolean; preset: Transfer | null }>({ open: false, preset: null });
  const [statement, setStatement] = useState<GroupMember | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [budget, setBudget] = useState<{ open: boolean; editing: GroupMonthlyBudget | null }>({ open: false, editing: null });
  const [category, setCategory] = useState<{ open: boolean; editing: GroupExpenseCategoryOption | null }>({ open: false, editing: null });
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  // The day the meal drawer shows; null when it is shut.
  const [mealDay, setMealDay] = useState<string | null>(null);
  // The answer a closed-month question is waiting for: false when the
  // dialog is shut without going ahead.
  const pendingAsk = useRef<((ok: boolean) => void) | null>(null);

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
      setup: data.isNew,
      empty: !data.isNew && data.contributions.length === 0 && data.expenses.length === 0 && data.meals.length === 0,
      mealsPooled,
      sharedEqually: sharedEqually(data.expenses, mealsPooled, data.members, data.range),
    };
  }, [data]);

  const monthLabel = monthName(data.range.key, locale, "long", true);
  const offline = t(OFFLINE_MESSAGE), stale = t(STALE_MESSAGE);

  function goToMonth(key: string) {
    startMoving(() => router.push(`/group-expenses/${data.businessId}?tab=${data.tab}&month=${key}`));
  }

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
      description: `${row.groupMember?.name ?? ""} · ${monthLabel}. ${t("The month's balances move the moment it is gone.")}${closedNote(row.date)}`,
      confirmLabel: t("Delete"),
      danger: true,
      onConfirm: () => run(() => deleteGroupContributionAction(data.businessId, row.id), t("Contribution deleted"), t("Failed to delete the contribution")),
    });

  const removeExpense = (row: GroupExpense) =>
    setConfirm({
      title: t("Delete this expense?"),
      description: `${row.category}${row.description ? ` · ${row.description}` : ""}. ${t("Every member's share shrinks the moment it is gone.")}${closedNote(row.date)}`,
      confirmLabel: t("Delete"),
      danger: true,
      onConfirm: () => run(() => deleteGroupExpenseAction(data.businessId, row.id), t("Expense deleted"), t("Failed to delete the expense")),
    });

  const removeMember = (target: GroupMember) =>
    setConfirm({
      title: t("Remove {name} from the group?", { name: target.name }),
      description: t("With no contribution or expense in their name they are deleted for good; otherwise they are archived and keep their past months."),
      confirmLabel: t("Remove"),
      danger: true,
      onConfirm: () =>
        startTransition(async () => {
          const result = await attempt(() => deleteGroupMemberAction(data.businessId, target.id), offline, stale);
          if (result.success) {
            toast.success(result.data?.action === "archived" ? t("This member has history, so they were archived instead") : t("Member removed"));
            setConfirm(null);
            router.refresh();
          } else {
            toast.error(result.message ?? t("Failed to remove member"));
          }
        }),
    });

  const toggleMember = (target: GroupMember) => run(() => updateGroupMemberAction(data.businessId, target.id, { status: target.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE" }), t(target.status === "ACTIVE" ? "Member archived" : "Member brought back"), t("Failed to update member"));

  const removeCategory = (target: GroupExpenseCategoryOption) =>
    setConfirm({
      title: t("Delete {name}?", { name: target.name }),
      description: t("Expenses already filed under it keep the name; it just can't be picked for new ones."),
      confirmLabel: t("Delete"),
      danger: true,
      onConfirm: () => run(() => deleteGroupExpenseCategoryAction(data.businessId, target.id), t("Category deleted"), t("Failed to delete category")),
    });

  const deleteGroup = () =>
    setConfirm({
      title: t("Delete {name}?", { name: data.name }),
      description: t("Removes the group with every member, entry and closed month. This can't be undone."),
      confirmLabel: t("Delete group"),
      danger: true,
      onConfirm: () =>
        startTransition(async () => {
          const result = await attempt(() => deleteBusinessAction(data.businessId), offline, stale);
          if (result.success) {
            toast.success(t("Group deleted"));
            router.push("/group-expenses");
            router.refresh();
          } else {
            toast.error(result.message ?? t("Failed to delete the group"));
          }
        }),
    });

  const openContribution = (memberId: string | null = null) => setContribution({ open: true, editing: null, memberId });
  const openStatement = (target: GroupMember) => setStatement(target);
  // A payment is dated inside the month on show: ask first if that day is closed.
  const openPayment = (preset: Transfer | null) => void askClosed(dayInMonth(data.range, data.today)).then((ok) => ok && setPayment({ open: true, preset }));

  const tabs: Record<GroupPageData["tab"], React.ReactNode> = {
    dashboard: view.setup ? (
      <GroupSetup data={data} view={view} onAddMember={() => setMember({ open: true, editing: null })} onSetBudget={() => setBudget({ open: true, editing: budgetFor(data.budgets, data.range) })} onAddContribution={() => openContribution()} onAddExpense={() => setExpense({ open: true, editing: null })} />
    ) : (
      <GroupDashboard data={data} view={view} onRecordPayment={openPayment} onStatement={openStatement} onSetBudget={() => setBudget({ open: true, editing: null })} />
    ),
    meals: <GroupMealsTab data={data} onDay={setMealDay} />,
    members: <GroupMembersTab data={data} view={view} onAdd={() => setMember({ open: true, editing: null })} onEdit={(target) => setMember({ open: true, editing: target })} onToggleStatus={toggleMember} onRemove={removeMember} onStatement={openStatement} />,
    contributions: <GroupContributionsTab data={data} view={view} onAdd={() => openContribution()} onEdit={(row) => guardEdit(row.date, () => setContribution({ open: true, editing: row, memberId: null }))} onRemove={removeContribution} />,
    expenses: <GroupExpensesTab data={data} view={view} onAdd={() => setExpense({ open: true, editing: null })} onEdit={(row) => guardEdit(row.date, () => setExpense({ open: true, editing: row }))} onRemove={removeExpense} />,
    settlement: <GroupSettlementTab data={data} view={view} onRecordPayment={openPayment} onCloseMonth={() => setCloseOpen(true)} />,
    settings: <GroupSettingsTab data={data} onEditBudget={() => setBudget({ open: true, editing: budgetFor(data.budgets, data.range) })} onAddCategory={() => setCategory({ open: true, editing: null })} onEditCategory={(editing) => setCategory({ open: true, editing })} onRemoveCategory={removeCategory} onDeleteGroup={deleteGroup} />,
  };

  return (
    <PageFrame className="gap-5">
      <GroupHeader
        businessId={data.businessId}
        name={data.name}
        members={data.members}
        settings={data.settings}
        tab={data.tab}
        monthKey={data.range.key}
        months={data.months}
        closed={view.closed}
        setup={view.setup}
        onMonthChange={goToMonth}
        onAddMember={() => setMember({ open: true, editing: null })}
        onAddContribution={() => openContribution()}
        onAddMeals={() => setMealDay(dayInMonth(data.range, data.today))}
        onAddExpense={() => setExpense({ open: true, editing: null })}
      />
      <div aria-busy={moving || undefined} className={cn("flex flex-col transition-opacity motion-reduce:transition-none", moving && "pointer-events-none opacity-60")}>
        {tabs[data.tab]}
      </div>

      <MealDrawer day={mealDay} onClose={() => setMealDay(null)} businessId={data.businessId} members={data.members} meals={data.meals} units={unitsOf(data.settings)} range={data.range} closedGuard={closedGuard} />
      <MemberDrawer open={member.open} onClose={() => setMember({ open: false, editing: null })} businessId={data.businessId} editing={member.editing} cashHolderId={data.settings.cashHolderMemberId} defaultJoin={view.setup ? "" : data.today} />
      <ContributionDrawer open={contribution.open} onClose={() => setContribution({ open: false, editing: null, memberId: null })} businessId={data.businessId} currency={data.currency} members={data.members} balances={view.balances} cashInHand={view.cash} range={data.range} today={data.today} editing={contribution.editing} presetMemberId={contribution.memberId} closedGuard={closedGuard} />
      <ExpenseDrawer open={expense.open} onClose={() => setExpense({ open: false, editing: null })} businessId={data.businessId} currency={data.currency} members={data.members} categories={data.categories} cashInHand={view.cash} range={data.range} today={data.today} editing={expense.editing} meals={data.settings.kind === "MESS" || data.settings.mealsOn} mealsOn={data.settings.mealsOn} closedGuard={closedGuard} />
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
      <CloseMonthDialog open={closeOpen} onClose={() => setCloseOpen(false)} businessId={data.businessId} currency={data.currency} range={data.range} today={data.today} settlement={data.settlement} sharedEqually={view.sharedEqually} />
      <MonthBudgetDialog open={budget.open} onClose={() => setBudget({ open: false, editing: null })} businessId={data.businessId} currency={data.currency} budgets={data.budgets} monthKey={data.range.key} editing={budget.editing} />
      <CategoryDrawer open={category.open} onClose={() => setCategory({ open: false, editing: null })} businessId={data.businessId} variant="group" editing={category.editing} currency={data.currency} />
      <ConfirmDialog
        open={confirm !== null}
        onClose={closeConfirm}
        onConfirm={() => confirm?.onConfirm()}
        icon={confirm?.danger ? <Trash2 /> : <Lock />}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        confirmLabel={confirm?.confirmLabel ?? ""}
        danger={confirm?.danger ?? true}
        isPending={isPending}
      />
    </PageFrame>
  );
}
