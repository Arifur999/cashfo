"use client";

import { CalendarCheck, CalendarPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Input from "@/components/smartly/form/Input";
import { useAmountField } from "@/hooks/useAmountField";
import type { GroupMember, GroupMonthlyBudget, GroupSettlementResult } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { type MonthRange, shiftMonth, shortName } from "@/lib/customer/groupDisplay";
import { closeGroupSettlementAction } from "@/lib/customer/groupExpensesActions";
import { budgetOf, type SettleCard } from "@/lib/customer/groupFamily";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "./GroupBits";
import { GroupDialog } from "./GroupDialog";

interface FamilyCloseDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
  range: MonthRange;
  members: GroupMember[];
  settlement: GroupSettlementResult;
  cards: SettleCard[];
  holderId: string | null;
  budgets: GroupMonthlyBudget[];
}

// Closing a family's month (the v7 board's dialog): what each member opens
// next month with, the accountant's cash, and the next month itself -- ready
// when it already has a budget, else made here with an optional one. Every
// balance carries forward.
export function FamilyCloseDialog({ open, onClose, businessId, currency, range, members, settlement, cards, holderId, budgets }: FamilyCloseDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [budget, setBudget] = useState("");
  const amountField = useAmountField(budget, setBudget, currency);
  const [isPending, startTransition] = useTransition();
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setCreating(false);
      setBudget("");
    }
  }

  const money = (value: number) => formatCurrency(Math.abs(value), currency, fmt);
  const month = monthName(range.key, fmt, "long", true);
  const nextKey = shiftMonth(range.key, 1);
  const next = monthName(nextKey, fmt, "long", true);
  const nextShort = monthName(nextKey, fmt, "long");
  const nextBudget = budgetOf(budgets, nextKey);
  const ready = nextBudget !== null;
  const open_ = cards.filter((card) => card.state.kind === "pays" || card.state.kind === "gets").length;
  const holder = holderId ? members.find((member) => member.id === holderId) : undefined;
  const holderCash = Number(settlement.accountantCash?.find((row) => row.groupMemberId === holderId)?.cash ?? settlement.cashInHand);
  const memberById = Object.fromEntries(members.map((member) => [member.id, member]));

  const subOf = (card: SettleCard): { sub: string; label: string; tone: string } => {
    if (Math.abs(card.after) < 0.005) return { sub: t("Paid in full in {month}", { month: monthName(range.key, fmt, "long") }), label: t("Settled"), tone: "text-ink-muted" };
    if (card.after > 0) return { sub: card.memberId === holderId ? t("Paid more than their part · kept as credit") : t("Paid more than their part · gets it back later"), label: t("Opening credit"), tone: "text-income" };
    return { sub: t("Paid less than their part · owes this in {month}", { month: nextShort }), label: t("Opening due"), tone: "text-expense" };
  };

  function close() {
    startTransition(async () => {
      const amount = Number(budget);
      const result = await attempt(
        () => closeGroupSettlementAction(businessId, { periodStart: range.from, periodEnd: range.to, carryForward: true, ...(creating && amount > 0 && { nextBudgetAmount: amount }) }),
        t(OFFLINE_MESSAGE),
        t(STALE_MESSAGE),
      );
      if (!result.success) {
        toast.error(result.message ?? t("Failed to close the month"));
        return;
      }
      toast.success(t("{month} is closed", { month }));
      onClose();
      router.refresh();
    });
  }

  const closeLabel = ready ? t("Close and carry to {month}", { month: nextShort }) : creating ? t("Create {next} and close {month}", { next: nextShort, month: monthName(range.key, fmt, "long") }) : t("Create {month} first", { month: nextShort });

  return (
    <GroupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={520}
      title={t("Close {month}", { month })}
      sub={open_ === 0 ? t("Everyone is settled for {month}. Only the accountant's cash and their own credit move forward.", { month: monthName(range.key, fmt, "long") }) : t("{count} payments are still open. Nothing is lost: what is left moves to {month} as an opening balance.", { count: formatCount(open_, fmt), month: nextShort })}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="button" onClick={close} disabled={isPending || (!ready && !creating)}>
            {isPending && <Loader />}
            {closeLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <span className="text-small font-semibold text-ink">{t("Opening balances for {month}", { month: nextShort })}</span>
        <div className="flex flex-col overflow-hidden rounded-field border border-line">
          {cards.map((card) => {
            const line = subOf(card);
            return (
              <div key={card.memberId} className="flex items-center gap-3 border-b border-divider px-3.5 py-2.5 last:border-b-0">
                <MemberAvatar member={memberById[card.memberId] ?? { id: card.memberId, name: card.name, photoUrl: null }} members={members} size={34} />
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate font-semibold text-ink">{card.name}</span>
                  <span className="truncate text-caption text-ink-muted">{line.sub}</span>
                </span>
                <span className="flex flex-col items-end leading-tight">
                  <span className={cn("text-caption font-semibold", line.tone)}>{line.label}</span>
                  <span className={cn("font-bold tabular-nums", line.tone)}>{money(card.after)}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {holder && (
        <div className={cn("flex items-center justify-between gap-3 rounded-field border px-3.5 py-3", holderCash < 0 ? "border-warning-line bg-warning-50" : "border-line bg-strip")}>
          <span className="flex flex-col leading-tight">
            <span className="font-semibold text-ink">{holderCash < 0 ? t("{name} spent more than they hold", { name: shortName(holder.name) }) : t("{name} opens {month} with cash in hand", { name: shortName(holder.name), month: nextShort })}</span>
            <span className="text-caption text-ink-muted">{holderCash < 0 ? t("Opening shortfall of the cash book") : t("Opening balance of the cash book")}</span>
          </span>
          <span className={cn("text-[18px] font-bold tabular-nums", holderCash < 0 ? "text-warning" : "text-ink")}>
            {holderCash < 0 ? "− " : ""}
            {money(holderCash)}
          </span>
        </div>
      )}

      {ready ? (
        <div className="flex items-start gap-3 rounded-field border border-emerald-line bg-emerald-soft px-3.5 py-3">
          <CalendarCheck className="mt-0.5 size-4.5 shrink-0 text-emerald" aria-hidden="true" />
          <span className="flex flex-col leading-tight">
            <span className="font-semibold text-ink">{t("{month} is ready", { month: next })}</span>
            <span className="text-caption text-ink-muted">{t("It was already created. The balances above move there automatically, budget {amount}.", { amount: money(nextBudget ?? 0) })}</span>
          </span>
        </div>
      ) : creating ? (
        <div className="flex flex-col gap-3 rounded-field border border-line bg-strip px-3.5 py-3">
          <div className="flex items-start justify-between gap-3">
            <span className="flex flex-col leading-tight">
              <span className="font-semibold text-ink">{t("New month: {month}", { month: next })}</span>
              <span className="text-caption text-ink-muted">{t("Set a budget now, or leave it empty and set it later.")}</span>
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>
              {t("Cancel")}
            </Button>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-small font-medium text-ink">
              {t("Monthly budget")} <span className="font-normal text-ink-muted">({t("optional")})</span>
            </span>
            <Input
              size="md"
              inputMode="decimal"
              {...amountField}
              placeholder={t("Leave empty to set later")}
              className="font-semibold tabular-nums"
              leading={<span className="flex h-10 w-9 items-center justify-center border-r border-line bg-surface text-body font-semibold text-ink-2">{currencySymbol(currency, fmt)}</span>}
              frameClassName="overflow-hidden pl-0"
            />
          </label>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-field border border-warning-line bg-warning-50 px-3.5 py-3">
          <span className="flex flex-col leading-tight">
            <span className="font-semibold text-ink">{t("{month} isn't created yet", { month: next })}</span>
            <span className="text-caption text-ink-muted">{t("Create it first, so the balances have a month to move into.")}</span>
          </span>
          <Button type="button" variant="secondary" size="sm" onClick={() => setCreating(true)}>
            <CalendarPlus aria-hidden="true" />
            {t("Create {month}", { month: nextShort })}
          </Button>
        </div>
      )}

      <p className="text-caption text-ink-muted">{t("{month} will be locked. These amounts show up in {next} as opening due or opening credit, and settle as members pay.", { month: monthName(range.key, fmt, "long"), next: nextShort })}</p>
    </GroupDialog>
  );
}
