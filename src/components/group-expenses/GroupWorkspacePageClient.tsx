"use client";

import { CircleUserRound, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type {
  GroupContribution,
  GroupExpense,
  GroupMember,
  GroupMemberStatus,
  GroupSettlementRecord,
  GroupSettlementResult,
} from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import {
  closeGroupSettlementAction,
  deleteGroupContributionAction,
  deleteGroupExpenseAction,
  deleteGroupMemberAction,
  updateGroupMemberAction,
} from "@/lib/groupExpensesActions";
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
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const tab = (searchParams.get("tab") as Tab | null) ?? "members";

  return (
    <div className="h-full bg-brand-content px-6 py-8 pb-24 md:pb-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">{businessName}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("Group / Mess Workspace")}</p>
      </div>

      {/* No in-page tab bar here -- Sidebar.tsx's GroupExpenseNavItem
          already renders these same four tabs as a submenu once a specific
          workspace is open, so a second copy here would be redundant. */}
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
  const [statusFilter, setStatusFilter] = useState<"" | GroupMemberStatus>("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filtered client-side, not via a URL param like Contributions/Expenses --
  // `members` here is the SAME full list the Contribution/Expense modals
  // need for their member pickers, so filtering it upstream in page.tsx
  // would wrongly hide archived members from those too.
  const visibleMembers = statusFilter ? members.filter((m) => m.status === statusFilter) : members;

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

  // One-click toggle, separate from the Edit modal -- Active <-> Archived is
  // the one field a user needs to flip often (e.g. a roommate moves out mid-
  // month, or comes back), unlike name/phone which rarely change.
  function toggleStatus(member: GroupMember) {
    const nextStatus: GroupMemberStatus = member.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
    setTogglingId(member.id);
    startTransition(async () => {
      const result = await updateGroupMemberAction(businessId, member.id, { status: nextStatus });
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to update member"));
      }
      setTogglingId(null);
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-500">{t("Status")}</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "" | GroupMemberStatus)}
            className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
          >
            <option value="">{t("All")}</option>
            <option value="ACTIVE">{t("Active")}</option>
            <option value="ARCHIVED">{t("Archived")}</option>
          </select>
        </div>
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
        {visibleMembers.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">{t("No members yet.")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{t("Member")}</th>
                <th className="px-4 py-3">{t("Phone")}</th>
                <th className="px-4 py-3">{t("Status")}</th>
                <th className="px-4 py-3 text-right">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {visibleMembers.map((member, index) => {
                const isArchived = member.status === "ARCHIVED";
                return (
                  <tr key={member.id}>
                    <td className="px-4 py-3 text-neutral-400">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-neutral-400">
                          {member.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={member.photoUrl} alt={member.name} className="h-8 w-8 object-cover" />
                          ) : (
                            <CircleUserRound className="h-5 w-5" />
                          )}
                        </div>
                        <span className={`font-medium text-neutral-800 ${isArchived ? "line-through opacity-60" : ""}`}>{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{member.phone ?? t("No phone number")}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleStatus(member)}
                        disabled={togglingId === member.id}
                        title={t("Click to toggle")}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide transition-colors disabled:opacity-50 ${
                          isArchived ? "bg-neutral-100 text-neutral-500 hover:bg-neutral-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        }`}
                      >
                        {isArchived ? t("Archived") : t("Active")}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
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
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [addOpen, setAddOpen] = useState(false);
  const [editingContribution, setEditingContribution] = useState<GroupContribution | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GroupContribution | null>(null);
  const [isPending, startTransition] = useTransition();

  const [memberId, setMemberId] = useState(searchParams.get("memberId") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  function applyFilters() {
    const params = new URLSearchParams({ tab: "contributions" });
    if (memberId) params.set("memberId", memberId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/group-expenses/${businessId}?${params.toString()}`);
  }

  function openCreate() {
    setEditingContribution(null);
    setAddOpen(true);
  }

  function openEdit(c: GroupContribution) {
    setEditingContribution(c);
    setAddOpen(true);
  }

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
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">{t("Member")}</label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
            >
              <option value="">{t("All Members")}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
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
            onClick={applyFilters}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            {t("Apply")}
          </button>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
        >
          <Plus className="h-4 w-4" /> {t("Add Contribution")}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        {contributions.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">{t("No contributions yet.")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{t("Member")}</th>
                <th className="px-4 py-3">{t("Date")}</th>
                <th className="px-4 py-3">{t("Note")}</th>
                <th className="px-4 py-3 text-right">{t("Amount")}</th>
                <th className="px-4 py-3 text-right">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {contributions.map((c, index) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 text-neutral-400">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-neutral-800">{c.groupMember.name}</td>
                  <td className="px-4 py-3 text-neutral-500">{fmtDate(c.date)}</td>
                  <td className="px-4 py-3 text-neutral-500">{c.note ?? "--"}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-brand-primary">{formatCurrency(c.amount, "BDT")}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        title={t("Edit")}
                        className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(c)}
                        title={t("Delete")}
                        className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-brand-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AddContributionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        businessId={businessId}
        members={members}
        editingContribution={editingContribution}
      />
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
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [addOpen, setAddOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<GroupExpense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GroupExpense | null>(null);
  const [isPending, startTransition] = useTransition();

  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  function applyFilters() {
    const params = new URLSearchParams({ tab: "expenses" });
    if (category) params.set("category", category);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/group-expenses/${businessId}?${params.toString()}`);
  }

  function openCreate() {
    setEditingExpense(null);
    setAddOpen(true);
  }

  function openEdit(e: GroupExpense) {
    setEditingExpense(e);
    setAddOpen(true);
  }

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
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">{t("Category")}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-primary"
            >
              <option value="">{t("All Categories")}</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {t(label)}
                </option>
              ))}
            </select>
          </div>
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
            onClick={applyFilters}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            {t("Apply")}
          </button>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
        >
          <Plus className="h-4 w-4" /> {t("Add Expense")}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        {expenses.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">{t("No expenses yet.")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-xs font-medium uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{t("Date")}</th>
                <th className="px-4 py-3">{t("Category")}</th>
                <th className="px-4 py-3">{t("Description")}</th>
                <th className="px-4 py-3">{t("Paid by")}</th>
                <th className="px-4 py-3 text-right">{t("Amount")}</th>
                <th className="px-4 py-3 text-right">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {expenses.map((e, index) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 text-neutral-400">{index + 1}</td>
                  <td className="px-4 py-3 text-neutral-500">{fmtDate(e.date)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                      {t(CATEGORY_LABELS[e.category] ?? e.category)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{e.description ?? "--"}</td>
                  <td className="px-4 py-3 text-neutral-500">{e.paidByMember?.name ?? "--"}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-brand-danger">{formatCurrency(e.amount, "BDT")}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(e)}
                        title={t("Edit")}
                        className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(e)}
                        title={t("Delete")}
                        className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-brand-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AddExpenseModal open={addOpen} onClose={() => setAddOpen(false)} businessId={businessId} members={members} editingExpense={editingExpense} />
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
