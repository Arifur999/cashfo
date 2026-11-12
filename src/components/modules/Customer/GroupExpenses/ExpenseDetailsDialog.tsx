"use client";

import { Lock } from "lucide-react";
import Button from "@/components/smartly/Button";
import type { GroupExpense } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { expenseShare, isDayClosed, shortName, SPLIT_LABELS } from "@/lib/customer/groupDisplay";
import { monthName } from "@/lib/customer/insights";
import { formatDate, formatDay } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CategoryTile, MemberAvatar } from "./GroupBits";
import { GroupDialog } from "./GroupDialog";
import type { GroupPageData, GroupView } from "./groupTypes";

interface ExpenseDetailsDialogProps {
  data: GroupPageData;
  view: GroupView;
  expense: GroupExpense | null;
  onClose: () => void;
  onEdit: (expense: GroupExpense) => void;
  onDelete: (expense: GroupExpense) => void;
  canEdit: boolean;
}

// One expense in full (the v16 FamilyExpenses board's details popup): where
// the money came from, how it is shared, each member's part, and who added
// it -- with Edit and Delete (Delete offers Undo).
export function ExpenseDetailsDialog({ data, view, expense, onClose, onEdit, onDelete, canEdit }: ExpenseDetailsDialogProps) {
  const { t, fmt } = useLocale();
  const money = (value: number | string) => formatCurrency(value, data.currency, fmt);
  if (!expense) return null;

  const pocket = expense.paidFrom === "MEMBER";
  const payer = expense.paidByMemberId ? view.memberById[expense.paidByMemberId] : undefined;
  const parts = data.members
    .map((member) => ({ member, part: expenseShare(expense, member.id, data.members, data.range, view.mealsPooled) }))
    .filter((row) => row.part > 0.004);
  const byShares = expense.split === "SHARES";
  const closed = isDayClosed(data.history, expense.date.slice(0, 10));
  const typed = expense.split === "EXACT";
  const chosen = expense.splits.length > 0;

  return (
    <GroupDialog
      open
      onClose={onClose}
      width={540}
      lead={<CategoryTile name={expense.category} categories={data.categories} size={36} />}
      title={
        <span className="flex items-start gap-3">
          <span className="min-w-0 flex-1 truncate">{expense.description || expense.category}</span>
          <span className="shrink-0 text-[20px] tabular-nums">{money(expense.amount)}</span>
        </span>
      }
      sub={
        <span className="text-[13px]">
          {expense.category} · {formatDay(expense.date.slice(0, 10), "d MMM yyyy", fmt)}
        </span>
      }
      bodyClassName="gap-4"
      footer={
        <>
          {canEdit && !closed && (
            <Button type="button" variant="secondary" size="lg" onClick={() => onDelete(expense)} className="mr-auto border-expense-line px-4 text-expense hover:bg-expense-soft">
              {t("Delete")}
            </Button>
          )}
          <Button type="button" variant="secondary" size="lg" onClick={onClose} className="px-4">
            {t("Close")}
          </Button>
          {canEdit && !closed && (
            <Button type="button" size="lg" onClick={() => onEdit(expense)} className="px-5.5">
              {t("Edit expense")}
            </Button>
          )}
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-0.75 rounded-[12px] border border-line-card px-3 py-2.5">
          <span className="text-caption text-ink-muted">{t("Paid from")}</span>
          <span className="truncate text-body font-semibold text-ink">
            {pocket ? t("Own pocket") : t("Group cash")} · {payer ? shortName(payer.name) : "–"}
          </span>
          <span className="text-caption text-ink-muted">{pocket ? t("Counts as their contribution") : t("Taken from the cash they hold")}</span>
        </div>
        <div className="flex flex-col gap-0.75 rounded-[12px] border border-line-card px-3 py-2.5">
          <span className="text-caption text-ink-muted">{t("How it is shared")}</span>
          <span className="truncate text-body font-semibold text-ink">{t(SPLIT_LABELS[expense.split] === "Exact amounts" ? "Custom amounts" : SPLIT_LABELS[expense.split])}</span>
          <span className="text-caption text-ink-muted">{typed ? t("Amounts typed by hand") : chosen ? t("Chosen for this expense") : t("The category’s rule")}</span>
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-[12px] border border-line-card">
        <div className="grid grid-cols-[minmax(0,1fr)_80px_110px] gap-2.5 bg-table-head px-3.5 py-2 text-caption font-semibold text-ink-muted">
          <span>{t("Member")}</span>
          <span className="text-right">{byShares ? t("Shares") : ""}</span>
          <span className="text-right">{t("Their part")}</span>
        </div>
        {parts.length === 0 && <p className="border-t border-divider px-3.5 py-3 text-[13px] text-ink-muted">{t("Shared at the month's meal rate: each member's part is known once the month's meals are in.")}</p>}
        {parts.map(({ member, part }) => (
          <div key={member.id} className="grid grid-cols-[minmax(0,1fr)_80px_110px] items-center gap-2.5 border-t border-divider px-3.5 py-2 text-[13.5px] tabular-nums">
            <span className="flex min-w-0 items-center gap-2">
              <MemberAvatar member={member} members={data.members} size={26} />
              <span className="truncate text-ink">{member.name}</span>
            </span>
            <span className="text-right text-ink-2">{byShares ? formatCount(Number(expense.splits.find((s) => s.groupMemberId === member.id)?.units ?? member.shareUnits), fmt) : ""}</span>
            <span className="text-right text-ink">{money(part)}</span>
          </div>
        ))}
        <div className="grid grid-cols-[minmax(0,1fr)_80px_110px] gap-2.5 border-t border-line px-3.5 py-2 text-[13.5px] font-bold tabular-nums">
          <span>{t("Total")}</span>
          <span />
          <span className="text-right">{money(expense.amount)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-caption font-semibold tracking-[0.04em] text-ink-muted uppercase">{t("History")}</span>
        <span className="flex items-center gap-2.5 text-[13px] text-ink-2">
          <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-emerald" />
          {expense.recordedByName
            ? t("Added by {name} on {date}", { name: shortName(expense.recordedByName), date: formatDate(expense.createdAt, "d MMM yyyy, h:mm a", "", fmt) })
            : t("Added on {date}", { date: formatDate(expense.createdAt, "d MMM yyyy, h:mm a", "", fmt) })}
        </span>
      </div>

      {closed && (
        <p className="flex items-center gap-2 rounded-[12px] bg-surface-sunken px-3 py-2.5 text-[12.5px] text-ink-soft">
          <Lock className="size-3.5 shrink-0" aria-hidden="true" />
          {t("{month} is closed, so this expense is locked.", { month: monthName(expense.date.slice(0, 7), fmt, "long", true) })}
        </p>
      )}
    </GroupDialog>
  );
}
