"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAmountField } from "@/hooks/useAmountField";
import type { GroupMember } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { shortName } from "@/lib/customer/groupDisplay";
import { createGroupHandoverAction, updateGroupHandoverAction } from "@/lib/customer/groupExpensesActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CloseX } from "./GroupBits";
import { MemberPicker } from "./MemberPicker";

// A handover being edited: who gave, who got, how much, when and why.
export interface HandoverDraft {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  date: string;
  note: string | null;
}

interface HandoverDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
  // The people who keep group cash (accountants and the cash holder), and the cash each holds now.
  holders: GroupMember[];
  cash: Record<string, number>;
  today: string;
  editing: HandoverDraft | null;
}

// Hand over cash (the v16 FamilyCashbook board): group cash moving from one
// holder to another. Only who keeps the cash changes, never a balance.
export function HandoverDialog({ open, onClose, businessId, currency, holders, cash, today, editing }: HandoverDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const amountField = useAmountField(amount, setAmount, currency);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filled once each time it opens.
  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? (editing?.id ?? "new") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setFromId(editing?.fromId ?? "");
      setToId(editing?.toId ?? "");
      setAmount(editing ? String(editing.amount) : "");
      setDate(editing?.date ?? today);
      setNote(editing?.note ?? "");
      setTried(false);
    }
  }

  const value = Number(amount) || 0;
  const from = holders.find((member) => member.id === fromId);
  const to = holders.find((member) => member.id === toId);
  const errors = {
    from: !from ? t("Pick who gives the cash.") : null,
    to: !to ? t("Pick who gets the cash.") : from && to && from.id === to.id ? t("Pick two different people.") : null,
    amount: !(value > 0) ? t("Enter an amount more than zero.") : null,
  };
  const valid = !errors.from && !errors.to && !errors.amount && !!date;
  // The giver's cash after this; an edit first gives back what it took.
  const before = from ? (cash[from.id] ?? 0) + (editing && editing.fromId === from.id ? editing.amount : 0) - (editing && editing.toId === from.id ? editing.amount : 0) : 0;
  const afterGive = before - value;
  const offline = t(OFFLINE_MESSAGE), stale = t(STALE_MESSAGE);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setTried(true);
    if (!valid || isPending || !from || !to) return;
    const input = { fromMemberId: from.id, toMemberId: to.id, amount: value.toFixed(2), date, note: note.trim() || (editing ? null : undefined) };
    startTransition(async () => {
      const result = await attempt(() => (editing ? updateGroupHandoverAction(businessId, editing.id, input) : createGroupHandoverAction(businessId, { ...input, note: input.note ?? undefined })), offline, stale);
      if (!result.success) {
        toast.error(result.message ?? t("Failed to save the handover"));
        return;
      }
      toast.success(editing ? t("Handover updated") : t("Cash handed over"));
      onClose();
      router.refresh();
    });
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text} {optional && <span className="font-normal text-ink-muted">({t("optional")})</span>}
    </span>
  );
  const shown = (message: string | null) => (tried && message ? <span className="text-caption text-expense">{message}</span> : null);

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-135 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-[20px] border border-line bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} noValidate className="flex max-h-[calc(100dvh-32px)] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-4">
            <span className="flex flex-col gap-0.5">
              <AlertDialogTitle className="text-h3 text-ink">{editing ? t("Edit handover") : t("Hand over cash")}</AlertDialogTitle>
              <AlertDialogDescription className="text-small text-ink-muted">{t("Group cash moving from one holder to another")}</AlertDialogDescription>
            </span>
            <CloseX onClick={onClose} disabled={isPending} />
          </div>

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 py-5">
            {holders.length < 2 ? (
              <p className="rounded-xl bg-strip px-3.5 py-3 text-small text-ink-2">{t("Only one person keeps group cash. Make another member an accountant in Members to hand cash over.")}</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] sm:items-start">
                <Field htmlFor="ho-from" label={label(t("From"))}>
                  <MemberPicker id="ho-from" label={t("From")} members={holders} value={fromId} onChange={setFromId} currency={currency} balances={cash} exclude={toId} />
                  {shown(errors.from)}
                </Field>
                <span className="flex h-6 items-center justify-center text-ink-muted sm:mt-8 sm:h-13.5">
                  <ArrowRight className="size-4.5 max-sm:rotate-90" aria-hidden="true" />
                </span>
                <Field htmlFor="ho-to" label={label(t("To"))}>
                  <MemberPicker id="ho-to" label={t("To")} members={holders.filter((member) => member.status === "ACTIVE")} value={toId} onChange={setToId} currency={currency} balances={cash} exclude={fromId} />
                  {shown(errors.to)}
                </Field>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
              <Field htmlFor="ho-amount" label={label(t("Amount"))}>
                <Input
                  id="ho-amount"
                  size="lg"
                  inputMode="decimal"
                  {...amountField}
                  placeholder="0"
                  className="text-h3 font-bold tabular-nums"
                  leading={<span className="flex h-12 w-10 items-center justify-center border-r border-line bg-strip text-title font-semibold text-ink-2">{currencySymbol(currency, fmt)}</span>}
                  frameClassName="overflow-hidden pl-0"
                />
                {shown(errors.amount)}
              </Field>
              <Field htmlFor="ho-date" label={label(t("Date"))}>
                <DayInput id="ho-date" size="lg" value={date} onChange={setDate} max={today} aria-label={t("Date")} />
              </Field>
            </div>

            <Field htmlFor="ho-note" label={label(t("Note"), true)}>
              <Input id="ho-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} placeholder={t("e.g. For the bazar this week")} />
            </Field>

            {from && value > 0 && (
              <div className="flex flex-col gap-1.5 rounded-[14px] border border-line bg-strip px-3.5 py-3 text-small tabular-nums">
                <div className="flex flex-wrap justify-between gap-x-3">
                  <span className="text-ink-2">{t("Cash in hand after this · {name}", { name: shortName(from.name) })}</span>
                  <b className={cn("font-bold", afterGive < -0.004 ? "text-warning" : "text-ink")}>
                    {afterGive < -0.004 ? "− " : ""}
                    {formatCurrency(Math.abs(afterGive), currency, fmt)}
                  </b>
                </div>
                {afterGive < -0.004 && <span className="text-caption text-warning">{t("More than the cash in hand: the rest would come from their own pocket.")}</span>}
                <span className="text-caption text-ink-muted">{t("A handover changes only who keeps the cash. Nobody’s balance changes.")}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-strip px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={isPending || holders.length < 2}>
              {isPending && <Loader />}
              {t("Save handover")}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
