"use client";

import { ArrowDownLeft, ArrowUpRight, CalendarDays, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { WalletPicker } from "@/components/modules/Customer/Shared/WalletPicker";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Account, Contact } from "@/lib/customer/api";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { balanceAfterEntry, DIRECTION_META, LOAN_ENTRY_KINDS, LOAN_ENTRY_META, loanDirection, type LoanEntryKind } from "@/lib/customer/loanDisplay";
import { normalizeMoneyInput } from "@/lib/customer/money";
import { listMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { payPaymentAction, receivePaymentAction, recordPurchaseAction, recordSaleAction } from "@/lib/customer/receivablesPayablesActions";
import { getAppToday } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ContactPicker } from "./ContactPicker";

interface LoanEntryDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  // Loan contacts only -- see loan-management/transactions/page.tsx.
  contacts: Contact[];
  currency: string;
  initialContactId?: string;
  initialKind?: LoanEntryKind;
}

// New loan entry: who, what happened (a loan given or taken, money back
// or paid back), through which wallet, how much -- and what both balances
// will be once it is saved. Every entry moves real money, so a wallet is
// always required.
export function LoanEntryDrawer({ open, onClose, businessId, contacts, currency, initialContactId, initialKind }: LoanEntryDrawerProps) {
  const { t } = useLocale();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 768px)");
  const amountId = useId();
  const [contactId, setContactId] = useState("");
  const [kind, setKind] = useState<LoanEntryKind>("GIVE_LOAN");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [wallets, setWallets] = useState<Account[]>([]);
  const [walletsError, setWalletsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setContactId(initialContactId ?? contacts[0]?.id ?? "");
      setKind(initialKind ?? "GIVE_LOAN");
      setAmount("");
      setNote("");
      setDate(getAppToday());
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    listMoneyAccountsAction(businessId).then((money) => {
      const list = money.data ?? [];
      setWallets(list);
      setWalletsError(money.success ? null : (money.message ?? "Failed to load your wallets"));
      setAccountId((current) => current || list[0]?.id || "");
      setLoading(false);
    });
  }, [open, businessId]);

  const contact = contacts.find((c) => c.id === contactId);
  const wallet = wallets.find((w) => w.id === accountId);
  const meta = LOAN_ENTRY_META[kind];
  const value = Number(amount) || 0;
  const walletAfter = wallet ? Number(wallet.currentBalance) + (meta.flow === "in" ? value : -value) : null;
  const balanceNow = contact ? Number(contact.currentBalance) : 0;
  const balanceAfter = balanceAfterEntry(balanceNow, kind, value);
  const valid = contactId.length > 0 && value > 0 && accountId.length > 0;

  const directionText = (balance: number) => {
    const direction = loanDirection(balance);
    return direction === "SETTLED" ? t("Settled") : `${t(DIRECTION_META[direction].name)} ${formatCurrency(Math.abs(balance), currency)}`;
  };

  function save(another: boolean) {
    if (!valid || isPending) return;
    startTransition(async () => {
      const base = { contactId, amount: value, date, description: note.trim() || undefined, moneyAccountId: accountId };
      const result =
        kind === "GIVE_LOAN" ? await recordSaleAction(businessId, base) : kind === "TAKE_LOAN" ? await recordPurchaseAction(businessId, base) : kind === "RECEIVE_PAYMENT" ? await receivePaymentAction(businessId, base) : await payPaymentAction(businessId, base);
      if (!result.success) {
        toast.error(result.message ?? t("Failed to record the entry"));
        return;
      }
      toast.success(t("Entry saved"));
      router.refresh();
      if (another) {
        setAmount("");
        setNote("");
        const money = await listMoneyAccountsAction(businessId);
        if (money.success && money.data) setWallets(money.data);
        document.getElementById(amountId)?.focus();
      } else {
        onClose();
      }
    });
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text} {optional && <span className="font-normal text-ink-muted">({t("optional")})</span>}
    </span>
  );

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-117.5 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] sm:max-w-117.5" : "h-[92vh] rounded-t-xl")}
      >
        <SheetHeader className={cn("flex-row items-center justify-between gap-3 space-y-0", wide ? "border-b border-line px-6 py-5" : "px-4 pt-4 pb-2")}>
          <SheetTitle className="text-h3 text-ink">{t("New loan entry")}</SheetTitle>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            save(false);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-5" : "px-4 py-3")}>
            <div className="flex flex-col gap-2">
              <label htmlFor="loan-who" className="text-body font-medium text-ink">
                {t("Bank / person")}
              </label>
              <ContactPicker id="loan-who" contacts={contacts} value={contactId} onChange={setContactId} currency={currency} size="xl" />
              {contacts.length === 0 && <p className="text-caption text-ink-muted">{t("Add a bank or person first, from People & banks.")}</p>}
            </div>

            <fieldset className="m-0 flex min-w-0 flex-col border-0 p-0">
              <legend className="mb-2 text-body font-medium text-ink">{t("What happened?")}</legend>
              <div role="radiogroup" className="grid grid-cols-2 gap-2">
                {LOAN_ENTRY_KINDS.map((option) => {
                  const on = option === kind;
                  const out = LOAN_ENTRY_META[option].flow === "out";
                  return (
                    <button key={option} type="button" role="radio" aria-checked={on} onClick={() => setKind(option)} className={cn("flex h-14 items-center gap-3 rounded-md border px-3 text-left transition-colors", on ? "border-[1.5px] border-emerald bg-mint-50" : "border-line bg-surface hover:border-line-strong")}>
                      {out ? <ArrowUpRight className="size-4.5 shrink-0 text-expense-fill" aria-hidden="true" /> : <ArrowDownLeft className="size-4.5 shrink-0 text-income" aria-hidden="true" />}
                      <span className="flex min-w-0 flex-col gap-px">
                        <span className={cn("text-small", on ? "font-bold text-emerald" : "font-semibold text-ink")}>{t(LOAN_ENTRY_META[option].title)}</span>
                        <span className="truncate text-caption font-normal text-ink-muted">{t(LOAN_ENTRY_META[option].sub)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px]">
              <WalletPicker label={t(meta.walletLabel)} size="lg" wallets={wallets} value={accountId} onChange={setAccountId} after={walletAfter} currency={currency} loading={loading} error={walletsError} onClose={onClose} />
              <Field htmlFor="loan-date" label={label(t("Date"))}>
                <Input id="loan-date" type="date" size="xl" value={date} onChange={(event) => setDate(event.target.value)} leading={<CalendarDays />} max={getAppToday()} className="px-0" frameClassName="px-3" />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-[190px_minmax(0,1fr)]">
              <Field htmlFor={amountId} label={label(t("Amount"))}>
                <Input
                  id={amountId}
                  type="text"
                  inputMode="decimal"
                  size="lg"
                  value={amount}
                  onChange={(event) => setAmount(normalizeMoneyInput(event.target.value))}
                  placeholder="0"
                  autoFocus
                  leading={<span className="flex h-12 w-10 items-center justify-center border-r border-line bg-cream text-h3 font-semibold text-ink-2">{currencySymbol(currency)}</span>}
                  frameClassName="gap-0 overflow-hidden pl-0"
                  className="pl-3 text-h3 font-bold tabular-nums"
                />
              </Field>
              <Field htmlFor="loan-note" label={label(t("Note"), true)}>
                <Input id="loan-note" size="lg" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder={t("Loan no. BL-2231")} className="px-0" frameClassName="px-3" />
              </Field>
            </div>

            {contact && (
              <div className="flex flex-col gap-2 rounded-md border border-line bg-cream px-4 py-3 text-small tabular-nums">
                <div className="flex justify-between gap-3">
                  <span className="truncate text-ink-2">{contact.name}</span>
                  <span>
                    <span className="text-ink-muted">{directionText(balanceNow)} → </span>
                    <span className={cn("font-bold", DIRECTION_META[loanDirection(balanceAfter)].text)}>{directionText(balanceAfter)}</span>
                  </span>
                </div>
                {wallet && walletAfter !== null && (
                  <div className="flex justify-between gap-3">
                    <span className="truncate text-ink-2">{wallet.name}</span>
                    <span>
                      <span className="text-ink-muted">{formatCurrency(wallet.currentBalance, currency)} → </span>
                      <span className="font-semibold text-ink">{formatCurrency(walletAfter, currency)}</span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={cn("flex items-center gap-2 border-t border-line bg-surface", wide ? "px-6 py-4" : "flex-wrap px-4 pt-3 pb-6")}>
            <Button type="button" variant="secondary" onClick={() => save(true)} disabled={!valid || isPending} className={cn("px-3", !wide && "order-2 flex-1")}>
              {t("Save & add another")}
            </Button>
            <span className="hidden flex-1 md:block" />
            <Button type="button" variant="ghost" onClick={onClose} className="hidden px-3 md:inline-flex">
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="action" disabled={!valid || isPending} className={cn("px-5", !wide && "order-1 w-full")}>
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {t(meta.save)}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
