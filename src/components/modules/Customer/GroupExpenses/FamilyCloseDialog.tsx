"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import type { GroupMember, GroupSettlementResult } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { type MonthRange, shiftMonth, shortName } from "@/lib/customer/groupDisplay";
import { closeGroupSettlementAction, settleUpAction } from "@/lib/customer/groupExpensesActions";
import type { SettleCard } from "@/lib/customer/groupFamily";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { dayInMonth } from "./ContributionDrawer";
import { MemberAvatar } from "./GroupBits";
import { GroupDialog } from "./GroupDialog";

interface FamilyCloseDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
  range: MonthRange;
  today: string;
  members: GroupMember[];
  settlement: GroupSettlementResult;
  cards: SettleCard[];
  holderId: string | null;
}

// Closing a month (the v16 FamilySettlement board's popup): what was spent,
// each member's balance, and what is still unpaid. Close and carry moves
// the unpaid amounts into next month as opening balances; or the suggested
// payments are recorded first (each through the cash holder), then it closes.
export function FamilyCloseDialog({ open, onClose, businessId, currency, range, today, members, settlement, cards, holderId }: FamilyCloseDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const money = (value: number) => formatCurrency(Math.abs(value), currency, fmt);
  const month = monthName(range.key, fmt, "long", true);
  const next = monthName(shiftMonth(range.key, 1), fmt, "long", true);
  const holder = holderId ? members.find((member) => member.id === holderId) : undefined;
  const memberById = Object.fromEntries(members.map((member) => [member.id, member]));
  // The payments still to make, all through the cash holder.
  const unpaid = holder ? cards.filter((card) => card.state.kind === "pays" || card.state.kind === "gets") : [];
  const transfers = unpaid.map((card) => {
    const owes = card.state.kind === "pays";
    return { card, fromId: owes ? card.memberId : (holder?.id ?? ""), toId: owes ? (holder?.id ?? "") : card.memberId, amount: Math.round(Math.abs(card.after) * 100) / 100 };
  });
  const nameOf = (id: string) => memberById[id]?.name ?? "";

  function closeMonth() {
    return attempt(() => closeGroupSettlementAction(businessId, { periodStart: range.from, periodEnd: range.to, carryForward: true }), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
  }

  function carry() {
    startTransition(async () => {
      const result = await closeMonth();
      if (!result.success) return void toast.error(result.message ?? t("Failed to close the month"));
      toast.success(t("{month} is closed", { month }));
      onClose();
      router.refresh();
    });
  }

  // Each suggested payment as it would be recorded on Settlement, then close.
  function settleAndClose() {
    startTransition(async () => {
      for (const transfer of transfers) {
        const result = await attempt(
          () =>
            settleUpAction(businessId, {
              fromMemberId: transfer.fromId,
              toMemberId: transfer.toId,
              amount: transfer.amount.toFixed(2),
              date: dayInMonth(range, today),
              payerNote: t("Paid to {name}", { name: nameOf(transfer.toId) }),
              receiverNote: t("Received from {name}", { name: nameOf(transfer.fromId) }),
            }),
          t(OFFLINE_MESSAGE),
          t(STALE_MESSAGE),
        );
        if (!result.success) {
          toast.error(result.message ?? t("Failed to record the payment"));
          router.refresh();
          return;
        }
      }
      const result = await closeMonth();
      if (!result.success) {
        toast.error(result.message ?? t("Failed to close the month"));
        router.refresh();
        return;
      }
      toast.success(t("Payments recorded and {month} closed", { month }));
      onClose();
      router.refresh();
    });
  }

  return (
    <GroupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={580}
      title={t("Close {month}", { month })}
      sub={t("Closing locks {month}: nobody can add, change or delete its entries. You can reopen it later if needed.", { month })}
      bodyClassName="gap-4"
      footer={
        <>
          <Button type="button" variant="ghost" size="lg" onClick={onClose} disabled={isPending} className="mr-auto px-4 text-ink-2">
            {t("Cancel")}
          </Button>
          <Button type="button" variant={transfers.length ? "secondary" : "primary"} size="lg" onClick={carry} disabled={isPending} className="px-4.5">
            {isPending && <Loader />}
            {transfers.length ? t("Close and carry balances to {month}", { month: next }) : t("Close {month}", { month })}
          </Button>
          {transfers.length > 0 && (
            <Button type="button" size="lg" onClick={settleAndClose} disabled={isPending} className="px-4.5">
              {t("Record the suggested payments and close")}
            </Button>
          )}
        </>
      }
    >
      <div className="flex items-center justify-between gap-3 rounded-[12px] bg-hover px-3.5 py-3">
        <span className="text-[13px] text-ink-muted">{t("Spent in {month}", { month })}</span>
        <span className="text-[17px] font-bold text-ink tabular-nums">{money(Number(settlement.totalExpense))}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-ink-2">{t("Each member’s balance")}</span>
        <div className="flex flex-col overflow-hidden rounded-[12px] border border-line">
          {cards.map((card) => {
            const even = Math.abs(card.after) < 0.005;
            return (
              <div key={card.memberId} className="flex items-center gap-3 border-b border-divider px-3.5 py-2.5 last:border-b-0">
                <MemberAvatar member={memberById[card.memberId] ?? { id: card.memberId, name: card.name, photoUrl: null }} members={members} size={30} />
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{card.name}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", even ? "bg-surface-sunken text-ink-muted" : card.after > 0 ? "bg-success-soft text-tint-green-ink" : "bg-expense-soft text-expense")}>{even ? t("Settled") : card.after > 0 ? t("Gets back") : t("Owes@@group")}</span>
                <span className={cn("w-28 text-right text-[13.5px] font-bold tabular-nums", even ? "text-ink" : card.after > 0 ? "text-tint-green-ink" : "text-expense")}>{even ? money(0) : formatSignedCurrency(card.after, currency, fmt)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-ink-2">{t("Still unpaid")}</span>
        {transfers.length === 0 ? (
          <span className="rounded-[12px] bg-success-soft/50 px-3.5 py-2.5 text-[13px] font-medium text-tint-green-ink">{t("Everyone is settled. Nothing to carry.")}</span>
        ) : (
          transfers.map((transfer) => (
            <div key={transfer.card.memberId} className="flex items-center justify-between gap-3 rounded-[12px] border border-line px-3.5 py-2.5 text-[13.5px]">
              <span className="text-ink-2">{t("{from} pays {to}", { from: shortName(nameOf(transfer.fromId)), to: shortName(nameOf(transfer.toId)) })}</span>
              <b className="font-bold text-ink tabular-nums">{money(transfer.amount)}</b>
            </div>
          ))
        )}
      </div>

      {transfers.length > 0 && <p className="text-caption leading-normal text-ink-muted">{t("Carry: the unpaid amounts move to {month} as opening balances. Record: choose this only if the money above was really handed over.", { month: next })}</p>}
    </GroupDialog>
  );
}
