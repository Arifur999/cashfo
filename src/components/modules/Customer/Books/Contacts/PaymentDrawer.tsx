"use client";

import { CircleAlert, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { WalletPicker } from "@/components/modules/Customer/Shared/WalletPicker";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import type { Account, InvoiceBreakdown } from "@/lib/customer/api";
import { booksDate, contactOwed } from "@/lib/customer/booksDisplay";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { limitMoneyDecimals } from "@/lib/customer/money";
import { listMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { getContactBalanceDetailAction, payPaymentAction, receivePaymentAction } from "@/lib/customer/receivablesPayablesActions";
import { getAppToday } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Drawer } from "../shared/Drawer";

interface PaymentDrawerProps {
  open: boolean;
  // Money coming in from a customer, or going out to a supplier.
  direction: "RECEIVABLE" | "PAYABLE";
  contact: { id: string; name: string };
  // The unpaid sales or purchases and everything owed on this side (them
  // plus what was owed from before Books), when the page already has them;
  // otherwise both are fetched when the drawer opens.
  outstanding?: InvoiceBreakdown[];
  owedTotal?: number;
  // Start on one bill: the one whose Pay was pressed, and its amount.
  settles?: string;
  amount?: string;
  businessId: string;
  currency: string;
  onClose: () => void;
}

interface Loaded {
  wallets: Account[];
  invoices: InvoiceBreakdown[];
  // What a payment on this side can settle at most.
  owed: number;
}

// Record a payment against what is owed: how much, when, through which
// wallet, and (optionally) which sale or purchase it settles. It can't be
// more than is owed, which the API would refuse anyway.
export function PaymentDrawer({ open, direction, contact, outstanding, owedTotal, settles, amount: startAmount, businessId, currency, onClose }: PaymentDrawerProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [accountId, setAccountId] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [note, setNote] = useState("");
  // Fetched each time the drawer opens; null while loading.
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  // The wallets or what is owed could not be read (an outage, no network):
  // said so, with Try again, rather than "No wallet yet".
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [isPending, startTransition] = useTransition();
  const receiving = direction === "RECEIVABLE";

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAmount(startAmount ? limitMoneyDecimals(String(Number(startAmount))) : "");
      setDate(getAppToday());
      setAppliedTo(settles ?? "");
      setNote("");
      setLoaded(null);
      setFailed(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const detail = outstanding ? Promise.resolve(null) : getContactBalanceDetailAction(businessId, contact.id);
    Promise.all([listMoneyAccountsAction(businessId), detail])
      .then(([walletList, fetched]) => {
        if (cancelled) return;
        if (!walletList.success || (!outstanding && !fetched)) {
          setFailed(true);
          return;
        }
        const side = fetched ? contactOwed(fetched, Number(fetched.currentBalance))[receiving ? "receivable" : "payable"] : null;
        const invoices = (outstanding ?? side?.invoices ?? []).filter((invoice) => Number(invoice.remainingAmount) > 0);
        const onInvoices = invoices.reduce((sum, invoice) => sum + Number(invoice.remainingAmount), 0);
        const wallets = walletList.data ?? [];
        setLoaded({ wallets, invoices, owed: Math.round((owedTotal ?? side?.total ?? onInvoices) * 100) / 100 });
        setAccountId((current) => current || wallets[0]?.id || "");
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, businessId, contact.id, outstanding, owedTotal, receiving, attempt]);

  function retry() {
    setFailed(false);
    setLoaded(null);
    setAttempt((count) => count + 1);
  }

  const wallets = loaded?.wallets ?? [];
  const invoices = loaded?.invoices ?? [];
  const due = loaded?.owed ?? 0;
  const applied = invoices.find((invoice) => invoice.transactionId === appliedTo);
  const value = Number(amount);
  const wallet = wallets.find((w) => w.id === accountId);
  // The most this payment can be: what is left on the picked bill, or
  // everything owed on this side. The Amount field's button fills it in.
  const limit = applied ? Number(applied.remainingAmount) : due;
  const over = loaded !== null && value > limit + 0.005;
  const valid = loaded !== null && value > 0 && !over && accountId !== "" && date.length === 10;
  const today = getAppToday();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const input = { contactId: contact.id, amount: value, date, moneyAccountId: accountId, description: note.trim() || undefined, appliedToTransactionId: appliedTo || undefined };
      const result = receiving ? await receivePaymentAction(businessId, input) : await payPaymentAction(businessId, input);
      if (result.success) {
        toast.success(t(receiving ? "{amount} received from {name}" : "{amount} paid to {name}", { amount: formatCurrency(value, currency, locale), name: contact.name }));
        onClose();
        router.refresh();
      } else {
        toast.error(t(result.message ?? "Failed to record payment"));
      }
    });
  }

  const optional = <span className="font-normal text-ink-muted"> ({t("optional")})</span>;

  return (
    <Drawer
      open={open}
      title={t(receiving ? "Payment from {name}" : "Payment to {name}", { name: contact.name })}
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
          loaded && limit > 0 ? (
            <button type="button" onClick={() => setAmount(limit.toFixed(2))} className="-my-1 py-1 text-right text-small font-semibold text-emerald hover:underline pointer-coarse:py-3">
              {applied ? t(receiving ? "Use {amount}@@receiving" : "Use {amount}@@paying", { amount: formatCurrency(limit, currency, locale) }) : t(receiving ? "They owe {amount} · use it all" : "You owe {amount} · use it all", { amount: formatCurrency(due, currency, locale) })}
            </button>
          ) : undefined
        }
        error={over ? (applied ? t("Only {amount} is left on that one.", { amount: formatCurrency(applied.remainingAmount, currency, locale) }) : t("Only {amount} is owed.", { amount: formatCurrency(due, currency, locale) })) : undefined}
      >
        <Input id="pay-amount" size="lg" inputMode="decimal" value={amount} onChange={(event) => setAmount(limitMoneyDecimals(event.target.value))} placeholder="0.00" autoFocus invalid={over} className="text-h3 tabular-nums" leading={<span className="text-h3 font-semibold text-ink-2">{currencySymbol(currency)}</span>} />
      </Field>
      <Field htmlFor="pay-date" label={t("Date")}>
        <DayInput id="pay-date" size="md" value={date} onChange={setDate} max={today} />
      </Field>
      {failed ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-expense-soft px-4 py-3 text-small text-expense">
          <span className="flex items-center gap-2">
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
            {t("Your wallets and what is owed couldn't be loaded.")}
          </span>
          <Button type="button" variant="secondary" size="sm" onClick={retry} className="pointer-coarse:h-11">
            <RotateCw />
            {t("Try again")}
          </Button>
        </div>
      ) : (
        // An empty list is the picker's own to say, with its "Add a wallet" link.
        <WalletPicker label={t(receiving ? "Into@@payment" : "From")} size="lg" variant="money" wallets={wallets} value={accountId} onChange={setAccountId} after={wallet && value > 0 ? Number(wallet.currentBalance) + (receiving ? value : -value) : null} minBalance={receiving ? 0 : value} currency={currency} loading={open && loaded === null} error={null} onClose={onClose} />
      )}
      {invoices.length > 0 && (
        <Field htmlFor="pay-applied" label={<>{t("Settles")}{optional}</>} hint={t("Left alone, the payment clears the oldest first.")}>
          <NativeSelect id="pay-applied" value={appliedTo} onChange={(event) => setAppliedTo(event.target.value)}>
            <option value="">{t("Oldest first")}</option>
            {invoices.map((invoice) => (
              <option key={invoice.transactionId} value={invoice.transactionId}>
                {booksDate(invoice.date, locale, { today })} · {invoice.description || t(receiving ? "Sale" : "Purchase")} · {t("{amount} left@@bill", { amount: formatCurrency(invoice.remainingAmount, currency, locale) })}
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
