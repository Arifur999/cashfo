"use client";

import { ArrowRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { GroupMember } from "@/lib/customer/api";
import { currencySymbol, formatSignedCurrency } from "@/lib/customer/currency";
import type { MonthRange, Transfer } from "@/lib/customer/groupDisplay";
import { createGroupContributionAction } from "@/lib/customer/groupExpensesActions";
import { monthName } from "@/lib/customer/insights";
import { normalizeMoneyInput } from "@/lib/customer/money";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { dayInMonth } from "./ContributionDrawer";
import { MemberPicker } from "./MemberPicker";

interface RecordPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
  members: GroupMember[];
  balances: Record<string, number>;
  range: MonthRange;
  today: string;
  // Who pays whom, when opened from a settle-up row.
  preset: Transfer | null;
}

// A member paying another to settle the month: saved as two entries dated
// inside the month, a deposit by the payer and a return to the receiver,
// so the fund's cash stays the same and both balances move.
export function RecordPaymentDialog({ open, onClose, businessId, currency, members, balances, range, today, preset }: RecordPaymentDialogProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const active = members.filter((member) => member.status === "ACTIVE");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
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
  const monthLabel = monthName(range.key, locale);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending || !from || !to) return;
    startTransition(async () => {
      const extra = note.trim() ? ` · ${note.trim()}` : "";
      const deposit = await createGroupContributionAction(businessId, { groupMemberId: from.id, amount: String(value), date, note: `${t("Paid to")} ${to.name}${extra}` });
      if (!deposit.success) {
        toast.error(deposit.message ?? t("Failed to record the payment"));
        return;
      }
      const back = await createGroupContributionAction(businessId, { groupMemberId: to.id, amount: String(-value), date, note: `${t("Received from")} ${from.name}${extra}` });
      if (!back.success) {
        toast.error(back.message ?? t("The payer's entry was saved, but not the receiver's. Add a return for them by hand."));
        router.refresh();
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
      <AlertDialogContent className="w-135 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0">
        <form onSubmit={submit} className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
            <AlertDialogTitle className="text-h3 text-ink">{t("Record a payment")}</AlertDialogTitle>
            <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
          <AlertDialogDescription className="sr-only">{t("One member pays another to settle the month.")}</AlertDialogDescription>

          <div className="flex flex-col gap-4 px-6 py-5">
            <div className="grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-end gap-2">
              <Field htmlFor="pay-from" label={label(t("Who paid"))}>
                <MemberPicker id="pay-from" members={active} value={fromId} onChange={setFromId} currency={currency} balances={balances} exclude={toId} />
              </Field>
              <span className="flex h-13.5 items-center justify-center text-ink-muted">
                <ArrowRight className="size-4.5" aria-hidden="true" />
              </span>
              <Field htmlFor="pay-to" label={label(t("Paid to"))}>
                <MemberPicker id="pay-to" members={active} value={toId} onChange={setToId} currency={currency} balances={balances} exclude={fromId} />
              </Field>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_190px] gap-3">
              <Field htmlFor="pay-amount" label={label(t("Amount"))}>
                <Input
                  id="pay-amount"
                  size="lg"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(normalizeMoneyInput(event.target.value))}
                  placeholder="0"
                  className="text-h3 font-bold tabular-nums"
                  leading={<span className="flex h-12 w-10 items-center justify-center border-r border-line bg-cream text-title font-semibold text-ink-2">{currencySymbol(currency)}</span>}
                  frameClassName="overflow-hidden pl-0"
                />
              </Field>
              <Field htmlFor="pay-month" label={label(t("Settles"))}>
                <span id="pay-month" className="flex h-12 items-center rounded-md border border-line-strong bg-cream px-3 text-body font-medium text-ink">
                  {monthLabel}
                </span>
              </Field>
            </div>

            <Field htmlFor="pay-note" label={label(t("Note"), true)}>
              <Input id="pay-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={120} placeholder={t("Cash, handed over")} />
            </Field>

            {from && to && (
              <div className="flex flex-col gap-3 rounded-md border border-line bg-cream p-4 text-small tabular-nums">
                <span className="text-caption font-semibold text-ink-muted">
                  {t("Saved as two entries dated")} {date}, {t("so")} {monthLabel} {t("evens out")}
                </span>
                <div className="flex justify-between gap-3">
                  <span className="text-ink-2">
                    <b className="font-semibold text-ink">{from.name}</b> · {t("deposit")} · “{t("Paid to")} {to.name}”
                  </span>
                  <span className="font-semibold text-income">{formatSignedCurrency(value, currency)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-ink-2">
                    <b className="font-semibold text-ink">{to.name}</b> · {t("return")} · “{t("Received from")} {from.name}”
                  </span>
                  <span className="font-semibold text-expense">{formatSignedCurrency(-value, currency)}</span>
                </div>
                <span className="h-px bg-line" />
                <div className="flex justify-between gap-3">
                  <span className="text-ink-2">
                    {from.name}
                    {t("'s balance")}
                  </span>
                  <span>
                    <span className={signedClass(balances[from.id] ?? 0)}>{formatSignedCurrency(balances[from.id] ?? 0, currency)}</span>
                    <span className="text-ink-muted"> → </span>
                    <b className={cn("font-bold", signedClass(after(from.id, 1)))}>{formatSignedCurrency(after(from.id, 1), currency)}</b>
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-ink-2">
                    {to.name}
                    {t("'s balance")}
                  </span>
                  <span>
                    <span className={signedClass(balances[to.id] ?? 0)}>{formatSignedCurrency(balances[to.id] ?? 0, currency)}</span>
                    <span className="text-ink-muted"> → </span>
                    <b className={cn("font-bold", signedClass(after(to.id, -1)))}>{formatSignedCurrency(after(to.id, -1), currency)}</b>
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-ink-2">{t("Cash in hand")}</span>
                  <span className="text-ink-muted">{t("unchanged")}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-line bg-cream px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!valid || isPending} className="px-5">
              {isPending && <Loader />}
              {t("Save payment")}
            </Button>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
