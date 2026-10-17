"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { WalletPicker } from "@/components/modules/Customer/Shared/WalletPicker";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import type { Account, InvoiceBreakdown } from "@/lib/customer/api";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { limitMoneyDecimals } from "@/lib/customer/money";
import { getMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { getContactBalanceDetailAction, payPaymentAction, receivePaymentAction } from "@/lib/customer/receivablesPayablesActions";
import { getAppToday } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Drawer } from "../shared/Drawer";

interface PaymentDrawerProps {
  open: boolean;
  // Money coming in from a customer, or going out to a supplier.
  direction: "RECEIVABLE" | "PAYABLE";
  contact: { id: string; name: string };
  // The unpaid sales or purchases, when the page already has them;
  // otherwise they are fetched when the drawer opens.
  outstanding?: InvoiceBreakdown[];
  businessId: string;
  currency: string;
  onClose: () => void;
}

// Record a payment against what is owed: how much, when, through which
// wallet, and (optionally) which sale or purchase it settles.
export function PaymentDrawer({ open, direction, contact, outstanding, businessId, currency, onClose }: PaymentDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [accountId, setAccountId] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [note, setNote] = useState("");
  // Fetched each time the drawer opens; null while loading.
  const [loaded, setLoaded] = useState<{ wallets: Account[]; invoices: InvoiceBreakdown[] } | null>(null);
  const [isPending, startTransition] = useTransition();
  const receiving = direction === "RECEIVABLE";

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAmount("");
      setDate(getAppToday());
      setAppliedTo("");
      setNote("");
      setLoaded(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([getMoneyAccountsAction(businessId), outstanding ? Promise.resolve(outstanding) : getContactBalanceDetailAction(businessId, contact.id).then((detail) => (receiving ? detail?.receivable.transactions : detail?.payable.transactions) ?? [])]).then(([wallets, invoices]) => {
      if (cancelled) return;
      setLoaded({ wallets, invoices: invoices.filter((invoice) => Number(invoice.remainingAmount) > 0) });
      setAccountId((current) => current || wallets[0]?.id || "");
    });
    return () => {
      cancelled = true;
    };
  }, [open, businessId, contact.id, outstanding, receiving]);

  const wallets = loaded?.wallets ?? [];
  const invoices = loaded?.invoices ?? [];
  const due = invoices.reduce((sum, invoice) => sum + Number(invoice.remainingAmount), 0);
  const applied = invoices.find((invoice) => invoice.transactionId === appliedTo);
  const value = Number(amount);
  const wallet = wallets.find((w) => w.id === accountId);
  const valid = value > 0 && accountId !== "" && date.length === 10 && (!applied || value <= Number(applied.remainingAmount) + 0.005);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const input = { contactId: contact.id, amount: value, date, moneyAccountId: accountId, description: note.trim() || undefined, appliedToTransactionId: appliedTo || undefined };
      const result = receiving ? await receivePaymentAction(businessId, input) : await payPaymentAction(businessId, input);
      if (result.success) {
        toast.success(`${formatCurrency(value, currency)} ${t(receiving ? "received from" : "paid to")} ${contact.name}`);
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to record payment"));
      }
    });
  }

  const optional = <span className="font-normal text-ink-muted"> ({t("optional")})</span>;

  return (
    <Drawer
      open={open}
      title={`${t(receiving ? "Payment from" : "Payment to")} ${contact.name}`}
      busy={isPending}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            {t("Cancel")}
          </Button>
          <Button type="submit" variant="action" disabled={!valid || isPending} className="px-5">
            {isPending && <Loader />}
            {t("Record payment")}
          </Button>
        </>
      }
    >
      <Field
        htmlFor="pay-amount"
        label={t("Amount")}
        aside={
          loaded && due > 0 ? (
            <button type="button" onClick={() => setAmount(due.toFixed(2))} className="text-small font-semibold text-emerald hover:underline">
              {t(receiving ? "They owe" : "You owe")} {formatCurrency(due, currency)} · {t("use it all")}
            </button>
          ) : undefined
        }
        error={applied && value > Number(applied.remainingAmount) + 0.005 ? `${t("Only")} ${formatCurrency(applied.remainingAmount, currency)} ${t("is left on that one.")}` : undefined}
      >
        <Input id="pay-amount" size="lg" inputMode="decimal" value={amount} onChange={(event) => setAmount(limitMoneyDecimals(event.target.value))} placeholder="0.00" autoFocus className="text-h3 tabular-nums" leading={<span className="text-h3 font-semibold text-ink-2">{currencySymbol(currency)}</span>} />
      </Field>
      <Field htmlFor="pay-date" label={t("Date")}>
        <Input id="pay-date" size="md" type="date" value={date} onChange={(event) => setDate(event.target.value)} max={getAppToday()} />
      </Field>
      <WalletPicker label={t(receiving ? "Into" : "From")} size="lg" variant="money" wallets={wallets} value={accountId} onChange={setAccountId} after={wallet && value > 0 ? Number(wallet.currentBalance) + (receiving ? value : -value) : null} minBalance={receiving ? 0 : value} currency={currency} loading={open && loaded === null} error={loaded && wallets.length === 0 ? t("No wallet yet. Add one under Wallets first.") : null} onClose={onClose} />
      {invoices.length > 0 && (
        <Field htmlFor="pay-applied" label={<>{t("Settles")}{optional}</>} hint={t("Left alone, the payment clears the oldest first.")}>
          <NativeSelect id="pay-applied" value={appliedTo} onChange={(event) => setAppliedTo(event.target.value)}>
            <option value="">{t("Oldest first")}</option>
            {invoices.map((invoice) => (
              <option key={invoice.transactionId} value={invoice.transactionId}>
                {formatDate(invoice.date, "d MMM")} · {invoice.description || t(receiving ? "Sale" : "Purchase")} · {formatCurrency(invoice.remainingAmount, currency)} {t("left")}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}
      <Field htmlFor="pay-note" label={<>{t("Note")}{optional}</>}>
        <Input id="pay-note" size="md" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t("e.g. Cheque 004418")} />
      </Field>
    </Drawer>
  );
}
