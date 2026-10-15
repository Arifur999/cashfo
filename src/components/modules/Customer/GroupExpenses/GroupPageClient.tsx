"use client";

import { Lock, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { CategoryDrawer } from "@/components/modules/Customer/Budget/CategoryDrawer";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import PageFrame from "@/components/smartly/PageFrame";
import type { GroupContribution, GroupExpense, GroupExpenseCategoryOption, GroupMember, GroupMonthlyBudget } from "@/lib/customer/api";
import { deleteBusinessAction } from "@/lib/customer/businessActions";
import { budgetFor, budgetStatus, cashInHand, isDayClosed, needsSetup, shiftMonth, spendByCategory, spendByMonth, type Transfer, whoPaysWhom } from "@/lib/customer/groupDisplay";
import { deleteGroupContributionAction, deleteGroupExpenseAction, deleteGroupExpenseCategoryAction, deleteGroupMemberAction, updateGroupMemberAction } from "@/lib/customer/groupExpensesActions";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CloseMonthDialog } from "./CloseMonthDialog";
import { ContributionDrawer } from "./ContributionDrawer";
import { ExpenseDrawer } from "./ExpenseDrawer";
import { GroupContributionsTab } from "./GroupContributionsTab";
import { GroupDashboard } from "./GroupDashboard";
import { GroupExpensesTab } from "./GroupExpensesTab";
import { GroupHeader } from "./GroupHeader";
import { GroupMembersTab } from "./GroupMembersTab";
import { GroupSettingsTab } from "./GroupSettingsTab";
import { GroupSettlementTab } from "./GroupSettlementTab";
import { GroupSetup } from "./GroupSetup";
import type { GroupPageData, GroupView } from "./groupTypes";
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
  const [member, setMember] = useState<{ open: boolean; editing: GroupMember | null }>({ open: false, editing: null });
  const [contribution, setContribution] = useState<{ open: boolean; editing: GroupContribution | null; memberId: string | null }>({ open: false, editing: null, memberId: null });
  const [expense, setExpense] = useState<{ open: boolean; editing: GroupExpense | null }>({ open: false, editing: null });
  const [payment, setPayment] = useState<{ open: boolean; preset: Transfer | null }>({ open: false, preset: null });
  const [statement, setStatement] = useState<GroupMember | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [budget, setBudget] = useState<{ open: boolean; editing: GroupMonthlyBudget | null }>({ open: false, editing: null });
  const [category, setCategory] = useState<{ open: boolean; editing: GroupExpenseCategoryOption | null }>({ open: false, editing: null });
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  const view = useMemo<GroupView>(() => {
    const activeMembers = data.members.filter((m) => m.status === "ACTIVE");
    const months = Array.from({ length: 6 }, (_, i) => shiftMonth(data.range.key, i - 5));
    const monthBudget = budgetFor(data.budgets, data.range);
    return {
      activeMembers,
      memberById: Object.fromEntries(data.members.map((m) => [m.id, m])),
      balances: Object.fromEntries(data.settlement.members.map((row) => [row.groupMemberId, Number(row.balance)])),
      cash: cashInHand(data.settlement),
      transfers: whoPaysWhom(data.settlement.members),
      budget: monthBudget ? budgetStatus(Number(monthBudget.budgetAmount), Number(data.settlement.totalExpense)) : null,
      byCategory: spendByCategory(data.expenses),
      byMonth: spendByMonth(data.recentExpenses, months),
      closed: data.closedRecord !== null,
      setup: needsSetup(data.contributions, data.expenses),
    };
  }, [data]);

  const monthLabel = monthName(data.range.key, locale, "long", true);

  function goToMonth(key: string) {
    router.push(`/group-expenses/${data.businessId}?tab=${data.tab}&month=${key}`);
  }

  // An entry dated inside a closed month: the record won't change, so ask
  // before touching it.
  function guardClosed(date: string, proceed: () => void) {
    if (!isDayClosed(data.history, date)) return proceed();
    setConfirm({
      title: t("This entry is in a closed month"),
      description: t("The closed record keeps its figures whatever you change here. Only the live numbers move. Go ahead?"),
      confirmLabel: t("Go ahead"),
      danger: false,
      onConfirm: () => {
        setConfirm(null);
        proceed();
      },
    });
  }

  function run(action: () => Promise<{ success: boolean; message?: string }>, done: string, failed: string) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(done);
        setConfirm(null);
        router.refresh();
      } else {
        toast.error(result.message ?? failed);
      }
    });
  }

  const removeContribution = (row: GroupContribution) =>
    guardClosed(row.date, () =>
      setConfirm({
        title: t("Delete this contribution?"),
        description: `${row.groupMember?.name ?? ""} · ${monthLabel}. ${t("The month's balances move the moment it is gone.")}`,
        confirmLabel: t("Delete"),
        danger: true,
        onConfirm: () => run(() => deleteGroupContributionAction(data.businessId, row.id), t("Contribution deleted"), t("Failed to delete the contribution")),
      }),
    );

  const removeExpense = (row: GroupExpense) =>
    guardClosed(row.date, () =>
      setConfirm({
        title: t("Delete this expense?"),
        description: `${row.category}${row.description ? ` · ${row.description}` : ""}. ${t("Every member's share shrinks the moment it is gone.")}`,
        confirmLabel: t("Delete"),
        danger: true,
        onConfirm: () => run(() => deleteGroupExpenseAction(data.businessId, row.id), t("Expense deleted"), t("Failed to delete the expense")),
      }),
    );

  const removeMember = (target: GroupMember) =>
    setConfirm({
      title: `${t("Remove")} ${target.name}?`,
      description: t("With no contribution or expense in their name they are deleted for good; otherwise they are archived and keep their past months."),
      confirmLabel: t("Remove"),
      danger: true,
      onConfirm: () =>
        startTransition(async () => {
          const result = await deleteGroupMemberAction(data.businessId, target.id);
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
      title: `${t("Delete")} ${target.name}?`,
      description: t("Expenses already filed under it keep the name; it just can't be picked for new ones."),
      confirmLabel: t("Delete"),
      danger: true,
      onConfirm: () => run(() => deleteGroupExpenseCategoryAction(data.businessId, target.id), t("Category deleted"), t("Failed to delete category")),
    });

  const deleteGroup = () =>
    setConfirm({
      title: `${t("Delete")} ${data.name}?`,
      description: t("Removes the group with every member, entry and closed month. This can't be undone."),
      confirmLabel: t("Delete group"),
      danger: true,
      onConfirm: () =>
        startTransition(async () => {
          const result = await deleteBusinessAction(data.businessId);
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

  const tabs: Record<GroupPageData["tab"], React.ReactNode> = {
    dashboard: view.setup ? (
      <GroupSetup data={data} view={view} onAddMember={() => setMember({ open: true, editing: null })} onSetBudget={() => setBudget({ open: true, editing: budgetFor(data.budgets, data.range) })} onAddContribution={() => openContribution()} onAddExpense={() => setExpense({ open: true, editing: null })} />
    ) : (
      <GroupDashboard data={data} view={view} onRecordPayment={(preset) => setPayment({ open: true, preset })} onStatement={openStatement} onSetBudget={() => setBudget({ open: true, editing: null })} />
    ),
    members: <GroupMembersTab data={data} view={view} onAdd={() => setMember({ open: true, editing: null })} onEdit={(target) => setMember({ open: true, editing: target })} onToggleStatus={toggleMember} onRemove={removeMember} onStatement={openStatement} />,
    contributions: <GroupContributionsTab data={data} view={view} onAdd={() => openContribution()} onEdit={(row) => guardClosed(row.date, () => setContribution({ open: true, editing: row, memberId: null }))} onRemove={removeContribution} />,
    expenses: <GroupExpensesTab data={data} view={view} onAdd={() => setExpense({ open: true, editing: null })} onEdit={(row) => guardClosed(row.date, () => setExpense({ open: true, editing: row }))} onRemove={removeExpense} />,
    settlement: <GroupSettlementTab data={data} view={view} onRecordPayment={(preset) => setPayment({ open: true, preset })} onCloseMonth={() => setCloseOpen(true)} />,
    settings: <GroupSettingsTab data={data} onAddBudget={() => setBudget({ open: true, editing: null })} onEditBudget={(editing) => setBudget({ open: true, editing })} onAddCategory={() => setCategory({ open: true, editing: null })} onEditCategory={(editing) => setCategory({ open: true, editing })} onRemoveCategory={removeCategory} onDeleteGroup={deleteGroup} />,
  };

  return (
    <PageFrame className="gap-5">
      <GroupHeader
        businessId={data.businessId}
        name={data.name}
        members={data.members}
        tab={data.tab}
        monthKey={data.range.key}
        months={data.months}
        closed={view.closed}
        setup={view.setup && view.activeMembers.length === 0}
        onMonthChange={goToMonth}
        onAddMember={() => setMember({ open: true, editing: null })}
        onAddContribution={() => openContribution()}
        onAddExpense={() => setExpense({ open: true, editing: null })}
      />
      {tabs[data.tab]}

      <MemberDrawer open={member.open} onClose={() => setMember({ open: false, editing: null })} businessId={data.businessId} editing={member.editing} />
      <ContributionDrawer open={contribution.open} onClose={() => setContribution({ open: false, editing: null, memberId: null })} businessId={data.businessId} currency={data.currency} members={data.members} balances={view.balances} cashInHand={view.cash} range={data.range} today={data.today} editing={contribution.editing} presetMemberId={contribution.memberId} />
      <ExpenseDrawer open={expense.open} onClose={() => setExpense({ open: false, editing: null })} businessId={data.businessId} currency={data.currency} members={data.members} categories={data.categories} cashInHand={view.cash} range={data.range} today={data.today} editing={expense.editing} />
      <RecordPaymentDialog open={payment.open} onClose={() => setPayment({ open: false, preset: null })} businessId={data.businessId} currency={data.currency} members={data.members} balances={view.balances} range={data.range} today={data.today} preset={payment.preset} />
      <MemberStatementDrawer
        open={statement !== null}
        onClose={() => setStatement(null)}
        data={data}
        view={view}
        member={statement}
        onRecordPayment={() => {
          const transfer = statement ? (view.transfers.find((tr) => tr.fromId === statement.id || tr.toId === statement.id) ?? null) : null;
          setStatement(null);
          setPayment({ open: true, preset: transfer });
        }}
      />
      <CloseMonthDialog open={closeOpen} onClose={() => setCloseOpen(false)} businessId={data.businessId} currency={data.currency} range={data.range} settlement={data.settlement} />
      <MonthBudgetDialog open={budget.open} onClose={() => setBudget({ open: false, editing: null })} businessId={data.businessId} currency={data.currency} budgets={data.budgets} monthKey={data.range.key} editing={budget.editing} />
      <CategoryDrawer open={category.open} onClose={() => setCategory({ open: false, editing: null })} businessId={data.businessId} variant="group" editing={category.editing} currency={data.currency} />
      <ConfirmDialog
        open={confirm !== null}
        onClose={() => !isPending && setConfirm(null)}
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
