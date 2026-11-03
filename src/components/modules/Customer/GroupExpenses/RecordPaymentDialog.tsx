"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAmountField } from "@/hooks/useAmountField";
import type { GroupMember } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { currencySymbol, formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { dayLabel, type MonthRange, shortName, type Transfer } from "@/lib/customer/groupDisplay";
import { settleUpAction } from "@/lib/customer/groupExpensesActions";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { dayInMonth } from "./ContributionDrawer";
import { CloseX } from "./GroupBits";
import { MemberPicker } from "./MemberPicker";

interface RecordPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
  members: GroupMember[];
  balances: Record<string, number>;
  // The fund's cash, which a payment between members leaves as it is.
  cashInHand: number;
  range: MonthRange;
  today: string;
  // Who pays whom, when opened from a settle-up row.
  preset: Transfer | null;
}

// A member paying another to settle the month: saved in one commit as two
// entries dated inside the month, a deposit by the payer and a return to
// the receiver, so the fund's cash stays the same and both balances move.
export function RecordPaymentDialog({ open, onClose, businessId, currency, members, balances, cashInHand, range, today, preset }: RecordPaymentDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const active = members.filter((member) => member.status === "ACTIVE");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const amountField = useAmountField(amount, setAmount, currency);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? `${preset?.fromId ?? ""}:${preset?.toId ?? ""}:${preset?.amount ?? ""}` : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setFromId(preset?.fromId ?? "");
      setToId(preset?.toId ?? "");
      setAmount(preset ? String(preset.amount) : "");
      setNote("");
    }
  }

  const from = active.find((m) => m.id === fromId);
  const to = active.find((m) => m.id === toId);
  const value = Number(amount) || 0;
  const valid = !!from && !!to && from.id !== to.id && value > 0;
  const date = dayInMonth(range, today);
  const monthLabel = monthName(range.key, fmt);
  const offline = t(OFFLINE_MESSAGE), stale = t(STALE_MESSAGE);

  // Each entry's note, one sentence each, with the person's own note when there is one.
  const extra = note.trim();
  const payerNote = to ? (extra ? t("Paid to {name} · {note}", { name: to.name, note: extra }) : t("Paid to {name}", { name: to.name })) : "";
  const receiverNote = from ? (extra ? t("Received from {name} · {note}", { name: from.name, note: extra }) : t("Received from {name}", { name: from.name })) : "";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending || !from || !to) return;
    startTransition(async () => {
      const result = await attempt(() => settleUpAction(businessId, { fromMemberId: from.id, toMemberId: to.id, amount: value.toFixed(2), date, payerNote, receiverNote }), offline, stale);
      if (!result.success) {
        toast.error(result.message ?? t("Failed to record the payment"));
        return;
      }
      toast.success(t("Payment recorded"));
      onClose();
      router.refresh();
    });
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text} {optional && <span className="font-normal text-ink-muted">({t("optional")})</span>}
    </span>
  );
  const after = (id: string, sign: 1 | -1) => (balances[id] ?? 0) + sign * value;
  const signedClass = (n: number) => (n < -0.004 ? "text-expense" : n > 0.004 ? "text-income" : "text-ink");

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-135 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-[20px] border border-line bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex max-h-[calc(100dvh-32px)] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
            <AlertDialogTitle className="text-h3 text-ink">{t("Record a payment")}</AlertDialogTitle>
            <CloseX onClick={onClose} disabled={isPending} />
          </div>
          <AlertDialogDescription className="sr-only">{t("One member pays another to settle the month.")}</AlertDialogDescription>

          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-6 py-5">
            {/* Side by side from sm up; stacked on a phone, the arrow pointing down. */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] sm:items-end">
              <Field htmlFor="pay-from" label={label(t("Who paid"))}>
                <MemberPicker id="pay-from" label={t("Who paid")} members={active} value={fromId} onChange={setFromId} currency={currency} balances={balances} exclude={toId} />
              </Field>
              <span className="flex h-6 items-center justify-center text-ink-muted sm:h-13.5">
                <ArrowRight className="size-4.5 max-sm:rotate-90" aria-hidden="true" />
              </span>
              <Field htmlFor="pay-to" label={label(t("Paid to"))}>
                <MemberPicker id="pay-to" label={t("Paid to")} members={active} value={toId} onChange={setToId} currency={currency} balances={balances} exclude={fromId} />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
              <Field htmlFor="pay-amount" label={label(t("Amount"))}>
                <Input
                  id="pay-amount"
                  size="lg"
                  inputMode="decimal"
                  {...amountField}
                  placeholder="0"
                  className="text-h3 font-bold tabular-nums"
                  leading={<span className="flex h-12 w-10 items-center justify-center border-r border-line bg-strip text-title font-semibold text-ink-2">{currencySymbol(currency, fmt)}</span>}
                  frameClassName="overflow-hidden pl-0"
                />
              </Field>
              {/* Not a field: the month is the one on show, read only. */}
              <dl className="flex min-w-0 flex-col gap-2">
                <dt className="text-small leading-[normal] font-semibold text-ink-2">
                  <span className="text-body font-medium text-ink">{t("Settles")}</span>
                </dt>
                <dd className="flex h-12 items-center rounded-field border border-input bg-surface px-3 text-body text-ink">{monthName(range.key, fmt, "long", true)}</dd>
              </dl>
            </div>

            <Field htmlFor="pay-note" label={label(t("Note"), true)}>
              <Input id="pay-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={120} placeholder={t("Cash, handed over")} />
            </Field>

            {from && to && (
              <div className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-strip px-3.5 py-3 text-small tabular-nums">
                <span className="text-caption font-semibold text-ink-muted">{t("Saved as two entries dated {date}, so {month} evens out", { date: dayLabel(date, fmt), month: monthLabel })}</span>
                <div className="flex justify-between gap-3">
                  <span className="min-w-0 text-ink-2">
                    <b className="font-semibold text-ink">{shortName(from.name)}</b> · {t("Deposit").toLocaleLowerCase()} · “{payerNote}”
                  </span>
                  <span className="shrink-0 font-semibold text-income">{formatSignedCurrency(value, currency, fmt)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="min-w-0 text-ink-2">
                    <b className="font-semibold text-ink">{shortName(to.name)}</b> · {t("Return").toLocaleLowerCase()} · “{receiverNote}”
                  </span>
                  <span className="shrink-0 font-semibold text-expense">{formatSignedCurrency(-value, currency, fmt)}</span>
                </div>
                <span className="h-px bg-line" />
                <div className="flex flex-wrap justify-between gap-x-3">
                  <span className="text-ink-2">{t("{name}'s balance", { name: shortName(from.name) })}</span>
                  <span>
                    <span className={signedClass(balances[from.id] ?? 0)}>{formatSignedCurrency(balances[from.id] ?? 0, currency, fmt)}</span>
                    <span className="text-ink-muted"> → </span>
                    <b className={cn("font-bold", signedClass(after(from.id, 1)))}>{formatSignedCurrency(after(from.id, 1), currency, fmt)}</b>
                  </span>
                </div>
                <div className="flex flex-wrap justify-between gap-x-3">
                  <span className="text-ink-2">{t("{name}'s balance", { name: shortName(to.name) })}</span>
                  <span>
                    <span className={signedClass(balances[to.id] ?? 0)}>{formatSignedCurrency(balances[to.id] ?? 0, currency, fmt)}</span>
                    <span className="text-ink-muted"> → </span>
                    <b className={cn("font-bold", signedClass(after(to.id, -1)))}>{formatSignedCurrency(after(to.id, -1), currency, fmt)}</b>
                  </span>
                </div>
                <div className="flex flex-wrap justify-between gap-x-3">
                  <span className="text-ink-2">{t("Cash in hand")}</span>
                  <span className="text-ink-muted">{t("{amount}, unchanged", { amount: formatCurrency(cashInHand, currency, fmt) })}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line bg-surface px-6 py-3.5">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="max-sm:flex-1">
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!valid || isPending} className="px-5 max-sm:flex-1">
              {isPending && <Loader />}
              {t("Save payment")}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
