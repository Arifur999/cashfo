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
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAmountField } from "@/hooks/useAmountField";
import type { GroupMember, GroupPayMethod } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { currencySymbol, formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { type MonthRange, type Transfer } from "@/lib/customer/groupDisplay";
import { settleUpAction } from "@/lib/customer/groupExpensesActions";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { dayInMonth } from "./ContributionDrawer";
import { CloseX } from "./GroupBits";

// How a payment was made (the v16 board's choices); it goes into the notes.
type PayHow = "cash" | "bkash" | "nagad" | "bank";
const PAY_HOW: Record<PayHow, string> = { cash: "Cash", bkash: "bKash", nagad: "Nagad", bank: "Bank" };

interface RecordPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
  members: GroupMember[];
  balances: Record<string, number>;
  // The fund's cash, which a payment between members leaves as it is
  // (not shown: the board's popup has no line for it).
  cashInHand?: number;
  range: MonthRange;
  today: string;
  // Who pays whom, when opened from a settle-up row.
  preset: Transfer | null;
  // An Editor works only in their own name: this member, fixed.
  selfOnly?: string | null;
}

// A member paying another to settle the month: saved in one commit as two
// entries dated inside the month, a deposit by the payer and a return to
// the receiver, so the fund's cash stays the same and both balances move.
export function RecordPaymentDialog({ open, onClose, businessId, currency, members, balances, range, today, preset, selfOnly = null }: RecordPaymentDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const active = members.filter((member) => member.status === "ACTIVE");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const amountField = useAmountField(amount, setAmount, currency);
  const [note, setNote] = useState("");
  // How it was paid, and the day (inside the month it settles, not after today).
  const [how, setHow] = useState<PayHow>("cash");
  const [day, setDay] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState("closed");
  const key = open ? `${preset?.fromId ?? ""}:${preset?.toId ?? ""}:${preset?.amount ?? ""}` : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setFromId(selfOnly ?? preset?.fromId ?? "");
      setToId(preset?.toId ?? "");
      setAmount(preset ? String(preset.amount) : "");
      setNote("");
      setHow("cash");
      setDay(dayInMonth(range, today));
    }
  }

  const from = active.find((m) => m.id === fromId);
  const to = active.find((m) => m.id === toId);
  const value = Number(amount) || 0;
  const valid = !!from && !!to && from.id !== to.id && value > 0;
  const lastDay = range.to < today ? range.to : today;
  const date = day && day >= range.from && day <= lastDay ? day : dayInMonth(range, today);
  const monthLabel = monthName(range.key, fmt, "long", true);
  const offline = t(OFFLINE_MESSAGE), stale = t(STALE_MESSAGE);

  // Each entry's note, one sentence each, with the person's own note. How it
  // was paid is saved on its own (Settlement's "How").
  const extra = note.trim();
  const payerNote = to ? (extra ? t("Paid to {name} · {note}", { name: to.name, note: extra }) : t("Paid to {name}", { name: to.name })) : "";
  const receiverNote = from ? (extra ? t("Received from {name} · {note}", { name: from.name, note: extra }) : t("Received from {name}", { name: from.name })) : "";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending || !from || !to) return;
    startTransition(async () => {
      const result = await attempt(() => settleUpAction(businessId, { fromMemberId: from.id, toMemberId: to.id, amount: value.toFixed(2), date, method: how.toUpperCase() as GroupPayMethod, payerNote, receiverNote }), offline, stale);
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
  // "Arif Mahmud · owes Tk 12,955" in the pickers, and the line under each
  // (the FamilySettlement board's payment popup).
  const money = (n: number) => formatCurrency(Math.abs(n), currency, fmt);
  const optionText = (member: GroupMember) => {
    const b = balances[member.id] ?? 0;
    return `${member.name} · ${b > 0.5 ? t("gets back {amount}", { amount: money(b) }) : b < -0.5 ? t("owes {amount}", { amount: money(b) }) : t("settled")}`;
  };
  const standing = (id: string) => {
    if (!id) return null;
    const b = balances[id] ?? 0;
    return b > 0.5
      ? { text: t("Gets back {amount} for {month}", { amount: money(b), month: monthLabel }), cls: "text-income" }
      : b < -0.5
        ? { text: t("Owes {amount} for {month}", { amount: money(b), month: monthLabel }), cls: "text-expense" }
        : { text: t("Settled for {month}", { month: monthLabel }), cls: "text-ink-muted" };
  };
  const payers = selfOnly ? active.filter((member) => member.id === selfOnly) : active;
  const picker = (id: string, value: string, onChange: (next: string) => void, list: GroupMember[], exclude: string) => (
    <NativeSelect id={id} size="md" value={value} onChange={(event) => onChange(event.target.value)} frameClassName="w-full" className="h-11.5 rounded-[12px] font-normal">
      {!value && <option value="">{t("Choose a member")}</option>}
      {list
        .filter((member) => member.id !== exclude)
        .map((member) => (
          <option key={member.id} value={member.id}>
            {optionText(member)}
          </option>
        ))}
    </NativeSelect>
  );
  const fromLine = standing(fromId);
  const toLine = standing(toId);
  const signedClass = (n: number) => (n < -0.004 ? "text-expense" : n > 0.004 ? "text-income" : "text-ink");

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-[560px] max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-[20px] border border-line bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex max-h-[calc(100dvh-32px)] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-divider pt-4 pr-5 pb-3.5 pl-6">
            <div className="flex min-w-0 flex-col gap-0.5">
              <AlertDialogTitle className="text-[18px] font-bold tracking-normal text-ink">{t("Record a payment")}</AlertDialogTitle>
              <AlertDialogDescription className="text-[12.5px] text-ink-muted">{t("Money one member gives another to even out balances. It is not spending.")}</AlertDialogDescription>
            </div>
            <CloseX onClick={onClose} disabled={isPending} className="rounded-full bg-surface-sunken" />
          </div>

          <div className="flex min-h-0 flex-col gap-3.5 overflow-y-auto px-6 py-4.5">
            {/* Side by side from sm up; stacked on a phone, the arrow pointing down. */}
            <div className="grid grid-cols-1 gap-x-2 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)]">
              <Field htmlFor="pay-from" label={label(t("Who paid"))}>
                {picker("pay-from", fromId, setFromId, payers, toId)}
              </Field>
              <span className="flex h-6 items-center justify-center self-end text-ink-muted sm:h-11.5">
                <ArrowRight className="size-4.5 max-sm:rotate-90" aria-hidden="true" />
              </span>
              <Field htmlFor="pay-to" label={label(t("Paid to"))}>
                {picker("pay-to", toId, setToId, active, fromId)}
              </Field>
              <span className={cn("text-[12.5px] font-medium max-sm:hidden", fromLine?.cls)}>{fromLine?.text}</span>
              <span className="max-sm:hidden" />
              <span className={cn("text-[12.5px] font-medium max-sm:hidden", toLine?.cls)}>{toLine?.text}</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field htmlFor="pay-amount" label={label(t("Amount"))}>
                <Input id="pay-amount" size="md" inputMode="decimal" {...amountField} placeholder="0" className="font-semibold tabular-nums" leading={<span className="text-[15px] font-semibold text-ink-faint">{currencySymbol(currency, fmt)}</span>} frameClassName="h-11.5 rounded-[12px]" />
              </Field>
              <Field htmlFor="pay-date" label={label(t("Date paid"))}>
                <DayInput id="pay-date" size="md" value={date} onChange={setDay} min={range.from} max={lastDay} aria-label={t("Date paid")} />
              </Field>
            </div>

            <fieldset className="flex min-w-0 flex-col gap-2">
              <legend className="mb-2 text-[13px] font-semibold text-ink-2">{t("How was it paid?")}</legend>
              <div role="radiogroup" aria-label={t("How was it paid?")} className="grid grid-cols-4 gap-2">
                {(Object.keys(PAY_HOW) as PayHow[]).map((key) => (
                  <button key={key} type="button" role="radio" aria-checked={how === key} onClick={() => setHow(key)} className={cn("h-10.5 rounded-[10px] border text-body font-semibold", how === key ? "border-[1.5px] border-emerald bg-emerald-wash text-emerald" : "border-line bg-surface text-ink-2 hover:border-mint-200")}>
                    {t(PAY_HOW[key])}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Not a field: the month is the one on show, read only. */}
              <dl className="flex min-w-0 flex-col gap-1.5">
                <dt className="text-[13px] font-semibold text-ink-2">{t("Settles the month")}</dt>
                <dd className="flex h-11.5 items-center rounded-[12px] border border-input bg-hover px-3 text-body text-ink">{monthName(range.key, fmt, "long", true)}</dd>
              </dl>
              <Field htmlFor="pay-note" label={label(t("Note"), true)}>
                <Input id="pay-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={120} placeholder={t("e.g. Txn ID 8XK2…")} frameClassName="h-11.5 rounded-[12px]" />
              </Field>
            </div>

            {from && to && value > 0 && (
              <div className="flex flex-col gap-2 rounded-[12px] border border-line bg-hover px-3.5 py-3 text-[13px] tabular-nums">
                <span className="text-[11.5px] font-semibold tracking-[0.04em] text-ink-muted uppercase">{t("After this, for {month}", { month: monthLabel })}</span>
                {[
                  { member: from, sign: 1 as const },
                  { member: to, sign: -1 as const },
                ].map(({ member, sign }) => (
                  <div key={member.id} className="flex flex-wrap justify-between gap-x-3">
                    <span className="text-ink-2">{member.name}</span>
                    <span>
                      <span className={signedClass(balances[member.id] ?? 0)}>{formatSignedCurrency(balances[member.id] ?? 0, currency, fmt)}</span>
                      <span className="text-ink-muted"> → </span>
                      <b className={cn("font-bold", signedClass(after(member.id, sign)))}>{formatSignedCurrency(after(member.id, sign), currency, fmt)}</b>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-divider bg-strip px-6 py-3.5">
            <Button type="button" variant="ghost" size="lg" onClick={onClose} disabled={isPending} className="px-4 text-ink-2 max-sm:flex-1">
              {t("Cancel")}
            </Button>
            <Button type="submit" size="lg" disabled={!valid || isPending} className="px-5.5 max-sm:flex-1">
              {isPending && <Loader />}
              {t("Save payment")}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
