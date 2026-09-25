"use client";

import { CircleUserRound, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type {
  GroupContribution,
  GroupExpense,
  GroupMember,
  GroupSettlementRecord,
  GroupSettlementResult,
} from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { closeGroupSettlementAction, deleteGroupContributionAction, deleteGroupExpenseAction, deleteGroupMemberAction } from "@/lib/groupExpensesActions";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { DatePicker } from "@/components/ui/DatePicker";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { AddContributionModal } from "./AddContributionModal";
import { AddExpenseModal } from "./AddExpenseModal";
import { GroupMemberFormModal } from "./GroupMemberFormModal";

interface GroupWorkspacePageClientProps {
  businessId: string;
  businessName: string;
  members: GroupMember[];
  contributions: GroupContribution[];
  expenses: GroupExpense[];
  settlement: GroupSettlementResult;
  settlementHistory: GroupSettlementRecord[];
}

type Tab = "members" | "contributions" | "expenses" | "settlement";

const TABS: { value: Tab; label: string }[] = [
  { value: "members", label: "Members" },
  { value: "contributions", label: "Contributions" },
  { value: "expenses", label: "Expenses" },
  { value: "settlement", label: "Settlement" },
];

const CATEGORY_LABELS: Record<string, string> = {
  GROCERY: "Grocery / Bazar",
  RENT: "Rent",
  UTILITY: "Utility",
  OTHER: "Other",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function GroupWorkspacePageClient({
  businessId,
  businessName,
  members,
  contributions,
  expenses,
  settlement,
  settlementHistory,
}: GroupWorkspacePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const tab = (searchParams.get("tab") as Tab | null) ?? "members";

  function setTab(next: Tab) {
    router.push(`/group-expenses/${businessId}?tab=${next}`);
  }

  return (
    <div className="h-full bg-brand-content px-6 py-8 pb-24 md:pb-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">{businessName}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("Group / Mess Workspace")}</p>
      </div>

      <div className="mb-6 flex w-fit gap-1 rounded-xl bg-neutral-100 p-1">
        {TABS.map((tabDef) => (
          <button
            key={tabDef.value}
            type="button"
            onClick={() => setTab(tabDef.value)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === tabDef.value ? "bg-surface text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t(tabDef.label)}
          </button>
        ))}
      </div>

      {tab === "members" && <MembersSection businessId={businessId} members={members} />}
      {tab === "contributions" && <ContributionsSection businessId={businessId} members={members} contributions={contributions} />}
      {tab === "expenses" && <ExpensesSection businessId={businessId} members={members} expenses={expenses} />}
      {tab === "settlement" && <SettlementSection businessId={businessId} settlement={settlement} settlementHistory={settlementHistory} />}
    </div>
  );
}

function MembersSection({ businessId, members }: { businessId: string; members: GroupMember[] }) {
  const router = useRouter();
  const { t } = useLocale();
  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<GroupMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GroupMember | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      const result = await deleteGroupMemberAction(businessId, target.id);
      if (result.success) {
        toast.success(result.data?.action === "archived" ? t("This member has history, so they were archived instead") : t("Member removed"));
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to remove member"));
      }
    });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => {
            setEditingMember(null);
            setFormOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
        >
          <Plus className="h-4 w-4" /> {t("Add Member")}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        {members.length === 0 && <p className="px-4 py-10 text-center text-sm text-neutral-400">{t("No members yet.")}</p>}
        <div className="divide-y divide-neutral-50">
          {members.map((member) => {
            const isArchived = member.status === "ARCHIVED";
            return (
              <div key={member.id} className={`flex items-center gap-3 px-4 py-3 ${isArchived ? "opacity-60" : ""}`}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                  <CircleUserRound className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium text-neutral-800 ${isArchived ? "line-through" : ""}`}>{member.name}</p>
                  <p className="text-xs text-neutral-400">
                    {member.phone ?? t("No phone number")}
                    {isArchived && (
                      <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                        {t("Archived")}
                      </span>
                    )}
                  </p>
                </div>
                {!isArchived && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMember(member);
                        setFormOpen(true);
                      }}
                      title={t("Edit")}
                      className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(member)}
                      title={t("Remove")}
                      className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-brand-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <GroupMemberFormModal open={formOpen} onClose={() => setFormOpen(false)} businessId={businessId} editingMember={editingMember} />
      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isPending={isPending}
        title={t("Remove Member")}
        message={
          deleteTarget
            ? `${t("Remove")} "${deleteTarget.name}"? ${t("If they have no contribution/expense history, they'll be permanently deleted; otherwise archived instead.")}`
            : ""
        }
        confirmLabel={t("Remove")}
      />
    </div>
  );
}

function ContributionsSection({ businessId, members, contributions }: { businessId: string; members: GroupMember[]; contributions: GroupContribution[] }) {
  const router = useRouter();
  const { t } = useLocale();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GroupContribution | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteGroupContributionAction(businessId, deleteTarget.id);
      if (result.success) {
        toast.success(t("Contribution removed"));
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to remove contribution"));
      }
    });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
        >
          <Plus className="h-4 w-4" /> {t("Add Contribution")}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        {contributions.length === 0 && <p className="px-4 py-10 text-center text-sm text-neutral-400">{t("No contributions yet.")}</p>}
        <div className="divide-y divide-neutral-50">
          {contributions.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-800">{c.groupMember.name}</p>
                <p className="text-xs text-neutral-400">
                  {fmtDate(c.date)}
                  {c.note && <span className="ml-2">-- {c.note}</span>}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-brand-primary">{formatCurrency(c.amount, "BDT")}</span>
              <button
                type="button"
                onClick={() => setDeleteTarget(c)}
                title={t("Delete")}
                className="shrink-0 rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-brand-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <AddContributionModal open={addOpen} onClose={() => setAddOpen(false)} businessId={businessId} members={members} />
      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isPending={isPending}
        title={t("Remove Contribution")}
        message={t("This will permanently remove this contribution entry.")}
        confirmLabel={t("Remove")}
      />
    </div>
  );
}

function ExpensesSection({ businessId, members, expenses }: { businessId: string; members: GroupMember[]; expenses: GroupExpense[] }) {
  const router = useRouter();
  const { t } = useLocale();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GroupExpense | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteGroupExpenseAction(businessId, deleteTarget.id);
      if (result.success) {
        toast.success(t("Expense removed"));
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to remove expense"));
      }
    });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
        >
          <Plus className="h-4 w-4" /> {t("Add Expense")}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        {expenses.length === 0 && <p className="px-4 py-10 text-center text-sm text-neutral-400">{t("No expenses yet.")}</p>}
        <div className="divide-y divide-neutral-50">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-800">{e.description || t(CATEGORY_LABELS[e.category] ?? e.category)}</p>
                <p className="text-xs text-neutral-400">
                  {fmtDate(e.date)}
                  <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                    {t(CATEGORY_LABELS[e.category] ?? e.category)}
                  </span>
                  {e.paidByMember && <span className="ml-2">{t("Paid by")} {e.paidByMember.name}</span>}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-brand-danger">{formatCurrency(e.amount, "BDT")}</span>
              <button
                type="button"
                onClick={() => setDeleteTarget(e)}
                title={t("Delete")}
                className="shrink-0 rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-brand-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <AddExpenseModal open={addOpen} onClose={() => setAddOpen(false)} businessId={businessId} members={members} />
      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isPending={isPending}
        title={t("Remove Expense")}
        message={t("This will permanently remove this expense entry.")}
        confirmLabel={t("Remove")}
      />
    </div>
  );
}

function SettlementSection({
  businessId,
  settlement,
  settlementHistory,
}: {
  businessId: string;
  settlement: GroupSettlementResult;
  settlementHistory: GroupSettlementRecord[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [from, setFrom] = useState(searchParams.get("from") ?? settlement.periodStart.slice(0, 10));
  const [to, setTo] = useState(searchParams.get("to") ?? settlement.periodEnd.slice(0, 10));
  const [closeOpen, setCloseOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function applyRange() {
    router.push(`/group-expenses/${businessId}?tab=settlement&from=${from}&to=${to}`);
  }

  function handleClose() {
    startTransition(async () => {
      const result = await closeGroupSettlementAction(businessId, { periodStart: from, periodEnd: to });
      if (result.success) {
        toast.success(t("Settlement closed"));
        setCloseOpen(false);
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to close settlement"));
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">{t("From")}</label>
          <DatePicker value={from} onChange={setFrom} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">{t("To")}</label>
          <DatePicker value={to} onChange={setTo} />
        </div>
        <button
          type="button"
          onClick={applyRange}
          className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          {t("Apply")}
        </button>
        <button
          type="button"
          disabled={settlement.memberCount === 0}
          onClick={() => setCloseOpen(true)}
          className="ml-auto rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {t("Close This Period")}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
          <p className="text-xs text-neutral-500">{t("Total Expense")}</p>
          <p className="mt-1 text-lg font-semibold text-neutral-900">{formatCurrency(settlement.totalExpense, "BDT")}</p>
        </div>
        <div className="rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
          <p className="text-xs text-neutral-500">{t("Members")}</p>
          <p className="mt-1 text-lg font-semibold text-neutral-900">{settlement.memberCount}</p>
        </div>
        <div className="rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
          <p className="text-xs text-neutral-500">{t("Per-Member Share")}</p>
          <p className="mt-1 text-lg font-semibold text-neutral-900">{formatCurrency(settlement.perMemberShare, "BDT")}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
              <th className="px-4 py-3">{t("Member")}</th>
              <th className="px-4 py-3 text-right">{t("Contributed")}</th>
              <th className="px-4 py-3 text-right">{t("Share")}</th>
              <th className="px-4 py-3 text-right">{t("Balance")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {settlement.members.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-neutral-400">
                  {t("No active members for this period.")}
                </td>
              </tr>
            )}
            {settlement.members.map((m) => {
              const balance = Number(m.balance);
              return (
                <tr key={m.groupMemberId}>
                  <td className="px-4 py-3 font-medium text-neutral-800">{m.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-600">{formatCurrency(m.contributed, "BDT")}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-600">{formatCurrency(m.share, "BDT")}</td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${balance >= 0 ? "text-emerald-600" : "text-brand-danger"}`}>
                    {balance >= 0 ? "+" : ""}
                    {formatCurrency(m.balance, "BDT")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {settlementHistory.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-neutral-700">{t("Closed Settlement History")}</h2>
          <div className="overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
            <div className="divide-y divide-neutral-50">
              {settlementHistory.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-neutral-800">
                      {fmtDate(s.periodStart)} - {fmtDate(s.periodEnd)}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {s.memberCount} {t("members")} -- {t("closed")} {fmtDate(s.closedAt)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-neutral-700">{formatCurrency(s.totalExpense, "BDT")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        onConfirm={handleClose}
        isPending={isPending}
        danger={false}
        title={t("Close This Period")}
        message={t("This locks in the current numbers for this period as a permanent settlement record. Later edits to contributions/expenses in this range won't change it.")}
        confirmLabel={t("Close")}
      />
    </div>
  );
}
