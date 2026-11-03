"use client";

import { ArrowDownLeft, ArrowUpRight, Percent, WifiOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/modules/Customer/Books/shared/Drawer";
import { useOnline } from "@/components/modules/Customer/Layout/useOnline";
import { WalletPicker } from "@/components/modules/Customer/Shared/WalletPicker";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { useAmountField } from "@/hooks/useAmountField";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account, Contact } from "@/lib/customer/api";
import { getBudgetCategoryNamesAction } from "@/lib/customer/budgetActions";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { balanceAfterEntry, DIRECTION_META, LOAN_ENTRY_KINDS, LOAN_ENTRY_META, loanDirection, loanErrorText, profitCategory, repaymentLimit, walletDeltaOf, type LoanBalanceDetail, type LoanEdit, type LoanEntryKind } from "@/lib/customer/loanDisplay";
import { correctTransactionAction, createExpenseAction, createIncomeAction, getExpenseAccountsAction, listMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { correctLoanEntryAction, getContactBalanceDetailAction, payPaymentAction, receivePaymentAction, recordPurchaseAction, recordSaleAction } from "@/lib/customer/receivablesPayablesActions";
import { getAppToday } from "@/lib/date";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ContactPicker } from "./ContactPicker";
import DayInput from "@/components/smartly/form/DayInput";
import { radioProps } from "./radio";

interface LoanEntryDrawerProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  // Active loan contacts only -- see loan-management/transactions/page.tsx.
  contacts: Contact[];
  currency: string;
  initialContactId?: string;
  initialKind?: LoanEntryKind;
  // Edit: the entry to change, its values filled in. Saving voids it as
  // Corrected and posts the changed one in its place.
  editing?: LoanEdit | null;
}

type Purpose = "PRINCIPAL" | "PROFIT";
type ProfitWay = "PAID" | "RECEIVED";

const PURPOSES: Purpose[] = ["PRINCIPAL", "PROFIT"];
const PROFIT_WAYS: ProfitWay[] = ["PAID", "RECEIVED"];
const PICKER_ID = "loan-who";

// The repayment a contact's detail tells the cap of, by kind.
const REPAYMENTS: Partial<Record<LoanEntryKind, { over: string; none: string; noneSub: string }>> = {
  RECEIVE_PAYMENT: { over: "They owe you {amount} at most", none: "Nothing to get back: they don't owe you anything right now.", noneSub: "Nothing to get back" },
  MAKE_PAYMENT: { over: "You owe them {amount} at most", none: "Nothing to pay back: you don't owe them anything right now.", noneSub: "Nothing to pay back" },
};

// New loan entry: who, whether it is the loan itself or its profit, what
// happened (a loan given or taken, money back or paid back; or profit paid
// or received, filed under a category), through which wallet, how much --
// and what both balances will be once it is saved. Every entry moves real
// money, so a wallet is always required. Profit never moves the loan. A
// repayment can't be more than is owed on its side, as the API checks.
export function LoanEntryDrawer({ open, onClose, businessId, contacts, currency, initialContactId, initialKind, editing = null }: LoanEntryDrawerProps) {
  const { t, locale, fmt } = useLocale();
  const router = useRouter();
  const online = useOnline();
  const wide = useMediaQuery("(min-width: 768px)");
  const amountId = useId();
  const groupId = useId();
  const [contactId, setContactId] = useState("");
  const [kind, setKind] = useState<LoanEntryKind>("GIVE_LOAN");
  const [purpose, setPurpose] = useState<Purpose>("PRINCIPAL");
  // Profit: I paid it (an expense) or I received it (an income).
  const [profitWay, setProfitWay] = useState<ProfitWay>("PAID");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<{ EXPENSE: string[]; INCOME: string[] }>({ EXPENSE: [], INCOME: [] });
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [amount, setAmount] = useState("");
  const amountField = useAmountField(amount, setAmount, currency);
  // A bank or service charge paid with it, out of the same wallet.
  const [charge, setCharge] = useState("");
  const chargeField = useAmountField(charge, setCharge, currency);
  // The slip or loan number (the board's Reference); the statement shows it
  // in its Reference column.
  const [reference, setReference] = useState("");
  const [wallets, setWallets] = useState<Account[]>([]);
  const [walletsError, setWalletsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // What the picked contact owes on each side, for the repayment cap; read
  // again after each save, since the save changed it.
  const [detail, setDetail] = useState<{ contactId: string; data: LoanBalanceDetail | null } | null>(null);
  const [saves, setSaves] = useState(0);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && editing) {
      // The entry as it was saved.
      setContactId(editing.contactId);
      setKind(editing.kind ?? "GIVE_LOAN");
      setPurpose(editing.profit ? "PROFIT" : "PRINCIPAL");
      setProfitWay(editing.profit && !editing.profit.paid ? "RECEIVED" : "PAID");
      setCategory(editing.profit?.category ?? "");
      setAmount(String(editing.amount));
      setCharge(editing.charge ? String(editing.charge) : "");
      setReference(editing.reference);
      setDate(editing.date);
      setAccountId(editing.accountId);
      setWalletsError(null);
      setLoading(true);
    } else if (open) {
      // Whoever the page opened it for, or the only one there is; never
      // whoever happens to sort first.
      setContactId(initialContactId && contacts.some((c) => c.id === initialContactId) ? initialContactId : contacts.length === 1 ? contacts[0].id : "");
      setKind(initialKind ?? "GIVE_LOAN");
      setPurpose("PRINCIPAL");
      setProfitWay("PAID");
      setCategory("");
      setAmount("");
      setCharge("");
      setReference("");
      setDate(getAppToday());
      setWalletsError(null);
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    let current = true;
    Promise.all([listMoneyAccountsAction(businessId), getBudgetCategoryNamesAction(businessId, "EXPENSE"), getBudgetCategoryNamesAction(businessId, "INCOME"), getExpenseAccountsAction(businessId)])
      .then(([money, expense, income, accounts]) => {
        if (!current) return;
        const list = money.data ?? [];
        setWallets(list);
        setWalletsError(money.success ? null : (money.message ?? "Failed to load your wallets"));
        setAccountId((picked) => picked || list[0]?.id || "");
        setCategories({ EXPENSE: expense.map((c) => c.name), INCOME: income.map((c) => c.name) });
        setExpenseAccounts(accounts);
      })
      // Offline or timed out: say so, rather than "Loading..." for ever.
      .catch(() => current && setWalletsError("Couldn't load your wallets. Check your connection and try again."))
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [open, businessId]);

  useEffect(() => {
    if (!open || !contactId) return;
    let current = true;
    getContactBalanceDetailAction(businessId, contactId)
      .then((data) => current && setDetail({ contactId, data }))
      // Unknown, so nothing is capped; the API still checks.
      .catch(() => current && setDetail({ contactId, data: null }));
    return () => {
      current = false;
    };
  }, [open, businessId, contactId, saves]);

  const contact = contacts.find((c) => c.id === contactId);
  const wallet = wallets.find((w) => w.id === accountId);
  const meta = LOAN_ENTRY_META[kind];
  const profit = purpose === "PROFIT";
  const profitPaid = profitWay === "PAID";
  const profitType = profitPaid ? "EXPENSE" : "INCOME";
  const options = categories[profitType];
  const picked = category && options.includes(category) ? category : profitCategory(options);
  // An expense posts against a real expense account; the category is its
  // label (the New transaction drawer's rule).
  const expenseAccountId = expenseAccounts.find((a) => a.name.toLowerCase().includes(picked.toLowerCase()))?.id ?? expenseAccounts[0]?.id ?? "";
  const value = Number(amount) || 0;
  const chargeValue = Number(charge) || 0;
  const money = (figure: number) => formatCurrency(figure, currency, fmt);
  // Edit: what the entry being changed did, taken back out of today's
  // figures (it is voided as the change is saved).
  const editingHere = editing && editing.contactId === contactId ? editing : null;
  const editedPrincipal = editingHere && editingHere.kind ? balanceAfterEntry(0, editingHere.kind, editingHere.amount) : 0;
  const editedWallet = editing && editing.accountId === accountId ? walletDeltaOf(editing) : 0;

  // undefined while it loads, null when it couldn't be told.
  const contactDetail = detail && detail.contactId === contactId ? detail.data : undefined;
  // Edit: the entry's own amount is free again on its side.
  const limitOf = (option: LoanEntryKind) => {
    const cap = contactDetail ? repaymentLimit(contactDetail, option) : null;
    return cap === null ? null : cap + (editingHere && editingHere.kind === option ? editingHere.amount : 0);
  };
  const repayment = !profit ? REPAYMENTS[kind] : undefined;
  const limit = repayment ? limitOf(kind) : null;
  const noneOwed = limit === 0;
  const overLimit = limit !== null && limit > 0 && value > limit + 0.005;
  const checkingLimit = !!repayment && !!contact && contactDetail === undefined;

  const flowIn = profit ? !profitPaid : meta.flow === "in";
  const walletBefore = wallet ? Number(wallet.currentBalance) - editedWallet : null;
  const walletAfter = walletBefore !== null ? walletBefore + (flowIn ? value : -value) - chargeValue : null;
  const balanceNow = contact ? Number(contact.currentBalance) - editedPrincipal : 0;
  const balanceAfter = profit ? balanceNow : balanceAfterEntry(balanceNow, kind, value);
  const valid = !!contact && value > 0 && accountId.length > 0 && (!profit || !profitPaid || expenseAccountId.length > 0) && !noneOwed && !overLimit && !checkingLimit;
  const canSave = valid && online && !isPending;
  const saveLabel = editing ? "Save changes" : profit ? (profitPaid ? "Save profit payment" : "Save profit received") : meta.save;
  const walletLabel = profit ? (profitPaid ? "Pay from" : "Money came into") : meta.walletLabel;
  const fallback = profit ? "Couldn't save the profit entry" : kind === "GIVE_LOAN" || kind === "TAKE_LOAN" ? "Couldn't save the loan" : "Couldn't save the payment";

  const directionText = (balance: number) => {
    const direction = loanDirection(balance);
    return direction === "SETTLED" ? t("Settled") : `${t(DIRECTION_META[direction].name)} ${money(Math.abs(balance))}`;
  };

  function save(another: boolean) {
    if (!canSave) return;
    startTransition(async () => {
      try {
        const referenceNo = reference.trim() || undefined;
        const charged = chargeValue > 0 ? chargeValue : undefined;
        const base = { contactId, amount: value, date, referenceNo, moneyAccountId: accountId, charge: charged };
        const filed = { contactId, amount: value, date, referenceNo, categoryId: picked || undefined, charge: charged };
        // Edit keeps the kind: a principal entry stays one, profit stays profit.
        const result = editing
          ? editing.profit
            ? await correctTransactionAction(businessId, editing.transactionId, profitPaid ? "EXPENSE" : "INCOME", profitPaid ? { ...filed, fromAccountId: accountId, expenseAccountId } : { ...filed, toAccountId: accountId })
            : await correctLoanEntryAction(businessId, editing.transactionId, kind, base)
          : profit
          ? profitPaid
            ? await createExpenseAction(businessId, { ...filed, fromAccountId: accountId, expenseAccountId })
            : await createIncomeAction(businessId, { ...filed, toAccountId: accountId })
          : kind === "GIVE_LOAN"
            ? await recordSaleAction(businessId, base)
            : kind === "TAKE_LOAN"
              ? await recordPurchaseAction(businessId, base)
              : kind === "RECEIVE_PAYMENT"
                ? await receivePaymentAction(businessId, base)
                : await payPaymentAction(businessId, base);
        if (!result.success) {
          toast.error(loanErrorText(result.message, fallback, t, money));
          return;
        }
        toast.success(t(editing ? "Changes saved" : "Entry saved"));
        router.refresh();
        // The old detail is stale now: until the fresh one is in, the cap
        // reads as being checked and Save waits, rather than allowing
        // what was owed before this entry.
        setDetail(null);
        setSaves((count) => count + 1);
        if (another) {
          setAmount("");
          setCharge("");
          setReference("");
          // The entry is saved: a wallet refresh that fails keeps the old
          // figures rather than reading as a failed save, inviting a second one.
          const fresh = await listMoneyAccountsAction(businessId).catch(() => null);
          if (fresh?.success && fresh.data) setWallets(fresh.data);
          document.getElementById(amountId)?.focus();
        } else {
          onClose();
        }
      } catch {
        // The request never got there (offline, timed out): the drawer and
        // what was typed stay, rather than the page's error screen.
        toast.error(t("Couldn't save. Check your connection and try again."));
      }
    });
  }

  const label = (text: string, optional = false) => (
    <span className="text-body font-medium text-ink">
      {text} {optional && <span className="font-normal text-ink-muted">({t("optional")})</span>}
    </span>
  );

  // Where focus starts: the amount once someone is picked, else the picker.
  function focusFirst(event: Event) {
    const target = document.getElementById(contactId ? amountId : PICKER_ID);
    if (!target || (target as HTMLButtonElement).disabled) return;
    event.preventDefault();
    target.focus();
  }

  const peopleLink = (
    <Link href="/loan-management/bank-person-list" onNavigate={onClose} className="font-semibold text-emerald hover:underline">
      {t("People & banks")}
    </Link>
  );

  return (
    <Drawer
      open={open}
      width={470}
      popup
      title={t(editing ? "Edit loan entry" : "New loan entry")}
      busy={isPending}
      onClose={onClose}
      onOpenAutoFocus={focusFirst}
      onSubmit={(event) => {
        event.preventDefault();
        save(false);
      }}
      footer={
        <div className="flex w-full flex-col gap-2">
          {!online && (
            <p role="status" className="flex items-center gap-2 text-caption text-warning">
              <WifiOff className="size-3.5 shrink-0" aria-hidden="true" />
              {t("You're offline. Saving waits until the internet is back.")}
            </p>
          )}
          {/* Tight enough that the longest primary (Save profit payment) still fits the 470px drawer. */}
          <div className={cn("flex items-center gap-2", !wide && "flex-wrap")}>
            {!editing && (
              <Button type="button" variant="secondary" onClick={() => save(true)} disabled={!canSave} className={cn("px-3", !wide && "order-2 flex-1")}>
                {t("Save & add another")}
              </Button>
            )}
            <span className="hidden flex-1 md:block" />
            <Button type="button" variant="ghost" onClick={onClose} className="hidden px-3 text-ink-soft md:inline-flex">
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!canSave} className={cn("px-4", !wide && "order-1 w-full")}>
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {t(saveLabel)}
            </Button>
          </div>
        </div>
      }
    >
      {/* The board's 14px between fields: the entry fits without a scroll. */}
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={PICKER_ID} className="text-body font-medium text-ink">
            {t("Bank / person")}
          </label>
          <ContactPicker id={PICKER_ID} contacts={contacts} value={contactId} onChange={setContactId} currency={currency} size="xl" label={t("Bank / person")} />
          {contacts.length === 0 && <p className="text-caption text-ink-muted">{fillNodes(t("Add a bank or person first, from {page}."), { page: peopleLink })}</p>}
        </div>

        <fieldset className="m-0 flex min-w-0 flex-col border-0 p-0">
          <legend id={`${groupId}-purpose`} className="mb-1.5 text-body leading-[normal] font-medium text-ink">
            {t("What is this money for?")}
          </legend>
          <div role="radiogroup" aria-labelledby={`${groupId}-purpose`} className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "PRINCIPAL", title: "Principal", sub: "Changes the balance", on: "border-emerald bg-mint-50", ink: "text-emerald", subInk: "text-ink-2" },
                { value: "PROFIT", title: "Profit / interest", sub: "Balance stays the same", on: "border-warning-fill bg-warning-50", ink: "text-warning-ink", subInk: "text-warning" },
              ] as const
            ).map((option) => {
              const on = option.value === purpose;
              return (
                <button key={option.value} {...radioProps(option.value, { values: PURPOSES, value: purpose, onChange: setPurpose, disabled: (candidate) => !!editing && candidate !== purpose })} className={cn("flex h-13 flex-col items-start justify-center gap-px rounded-field border px-3 text-left transition-colors", on ? cn("border-[1.5px]", option.on) : "border-line bg-surface hover:border-line-strong")}>
                  <span className={cn("text-small", on ? cn("font-bold", option.ink) : "font-semibold text-ink")}>{t(option.title)}</span>
                  <span className={cn("text-caption font-normal", on ? option.subInk : "text-ink-muted")}>{t(option.sub)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {profit ? (
          <>
            <fieldset className="m-0 flex min-w-0 flex-col border-0 p-0">
              <legend id={`${groupId}-way`} className="mb-1.5 text-body leading-[normal] font-medium text-ink">
                {t("Did you pay it or receive it?")}
              </legend>
              <div role="radiogroup" aria-labelledby={`${groupId}-way`} className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "PAID", title: "I paid profit", sub: "Money went out · expense", on: "border-expense-fill bg-expense-soft/50", ink: "text-expense" },
                    { value: "RECEIVED", title: "I received profit", sub: "Money came in · income", on: "border-income bg-mint-50/50", ink: "text-income" },
                  ] as const
                ).map((option) => {
                  const on = option.value === profitWay;
                  return (
                    <button key={option.value} {...radioProps(option.value, { values: PROFIT_WAYS, value: profitWay, onChange: setProfitWay, disabled: (candidate) => !!editing && candidate !== profitWay })} className={cn("flex h-13 items-center gap-2.5 rounded-field border px-3 text-left transition-colors", on ? cn("border-[1.5px]", option.on) : "border-line bg-surface hover:border-line-strong")}>
                      {option.value === "PAID" ? <ArrowUpRight className="size-4.5 shrink-0 text-expense-fill" strokeWidth={2.25} aria-hidden="true" /> : <ArrowDownLeft className="size-4.5 shrink-0 text-income" strokeWidth={2.25} aria-hidden="true" />}
                      <span className="flex min-w-0 flex-col gap-px">
                        <span className={cn("text-small", on ? cn("font-bold", option.ink) : "font-semibold text-ink")}>{t(option.title)}</span>
                        <span className={cn("truncate text-caption font-normal", on ? option.ink : "text-ink-muted")}>{t(option.sub)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <Field htmlFor="loan-category" label={label(t(profitPaid ? "Expense category" : "Income category"))} hint={t(profitPaid ? "Counted as an expense in this category. Your wallet changes once, from this entry." : "Counted as income in this category. Your wallet changes once, from this entry.")}>
              {/* The board's percent tile before the category's name. */}
              <span className="relative flex min-w-0">
                <span aria-hidden="true" className={cn("pointer-events-none absolute top-1/2 left-3.5 z-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-sm", profitPaid ? "bg-warning-soft text-warning" : "bg-mint-50 text-emerald")}>
                  <Percent className="size-3.5" strokeWidth={2.25} />
                </span>
                <NativeSelect id="loan-category" size="lg" value={picked} onChange={(event) => setCategory(event.target.value)} disabled={options.length === 0} frameClassName="w-full" className="pl-13 font-semibold">
                  {options.length === 0 && <option value="">{t(loading ? "Loading..." : "No categories yet")}</option>}
                  {options.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </NativeSelect>
              </span>
            </Field>
          </>
        ) : (
          <fieldset className="m-0 flex min-w-0 flex-col border-0 p-0">
            <legend id={`${groupId}-kind`} className="mb-1.5 text-body leading-[normal] font-medium text-ink">
              {t("What happened?")}
            </legend>
            <div role="radiogroup" aria-labelledby={`${groupId}-kind`} aria-describedby={noneOwed ? `${groupId}-kind-error` : undefined} className="grid grid-cols-2 gap-2">
              {LOAN_ENTRY_KINDS.map((option) => {
                const on = option === kind;
                const out = LOAN_ENTRY_META[option].flow === "out";
                // Nothing owed on that side: it shows, with why, but can't be picked.
                const blocked = limitOf(option) === 0 || (!!editing && option !== kind);
                return (
                  <button
                    key={option}
                    {...radioProps(option, { values: LOAN_ENTRY_KINDS, value: kind, onChange: setKind, disabled: (candidate) => candidate !== kind && (!!editing || limitOf(candidate) === 0) })}
                    className={cn("flex h-14 items-center gap-2.5 rounded-field border px-3 text-left transition-colors", on ? "border-[1.5px] border-emerald bg-mint-50" : "border-line bg-surface hover:border-line-strong", blocked && !on && "cursor-not-allowed opacity-60 hover:border-line")}
                  >
                    {out ? <ArrowUpRight className="size-4.5 shrink-0 text-expense-fill" strokeWidth={2.25} aria-hidden="true" /> : <ArrowDownLeft className="size-4.5 shrink-0 text-income" strokeWidth={2.25} aria-hidden="true" />}
                    <span className="flex min-w-0 flex-col gap-px">
                      <span className={cn("text-small", on ? "font-bold text-emerald" : "font-semibold text-ink")}>{t(LOAN_ENTRY_META[option].title)}</span>
                      <span className="truncate text-caption font-normal text-ink-muted">{blocked && limitOf(option) === 0 ? t(REPAYMENTS[option]?.noneSub ?? "") : t(LOAN_ENTRY_META[option].sub)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {noneOwed && repayment && (
              <p id={`${groupId}-kind-error`} role="alert" className="mt-2 text-caption text-expense">
                {t(repayment.none)}
              </p>
            )}
          </fieldset>
        )}

        <div className="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_150px]">
          <WalletPicker label={t(walletLabel)} size="lg" wallets={wallets} value={accountId} onChange={setAccountId} after={walletAfter} currency={currency} loading={loading} error={walletsError} onClose={onClose} />
          <Field htmlFor="loan-date" label={label(t("Date"))}>
            <DayInput id="loan-date" size="xl" value={date} onChange={setDate} max={getAppToday()} className="gap-2 text-body" />
          </Field>
        </div>

        <div className="grid gap-2.5 md:grid-cols-[180px_130px_minmax(0,1fr)]">
          <Field htmlFor={amountId} label={label(t("Amount"))} error={overLimit && repayment && limit !== null ? t(repayment.over, { amount: money(limit) }) : undefined}>
            <Input
              id={amountId}
              type="text"
              inputMode="decimal"
              size="lg"
              {...amountField}
              placeholder="0"
              invalid={overLimit}
              leading={<span className="flex h-12 w-10 items-center justify-center border-r border-line bg-strip text-[17px] font-semibold text-ink-soft">{currencySymbol(currency, fmt)}</span>}
              frameClassName="h-12 gap-0 overflow-hidden rounded-sm pl-0"
              className="pl-3 text-h3 font-bold tabular-nums"
            />
          </Field>
          <Field htmlFor="loan-charge" label={label(t("Charge"), true)} hint={chargeValue > 0 ? t("Paid from the same wallet, as an expense") : undefined}>
            <Input id="loan-charge" type="text" inputMode="decimal" size="lg" {...chargeField} placeholder="0" className="px-0 tabular-nums" frameClassName="px-3" />
          </Field>
          <Field htmlFor="loan-ref" label={label(t("Reference"), true)}>
            <Input id="loan-ref" size="lg" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={100} placeholder={t(profit ? "e.g. Sep profit · slip 4471" : "e.g. Loan no. BL-2231")} className="px-0" frameClassName="px-3" />
          </Field>
        </div>

        {contact && (
          <div className="flex flex-col gap-2 rounded-md border border-line bg-strip px-3.5 py-3 text-small tabular-nums">
            {profit ? (
              <>
                <div className="flex justify-between gap-3">
                  <span className="truncate text-ink-2">{t("{name} loan", { name: contact.name })}</span>
                  <span className="font-semibold text-ink">
                    {directionText(balanceNow)} · <span className="font-medium text-ink-muted">{t("no change")}</span>
                  </span>
                </div>
                {picked && (
                  <div className="flex justify-between gap-3">
                    <span className="truncate text-ink-2">{t(profitPaid ? "{category} expense, {month}" : "{category} income, {month}", { category: picked, month: formatDate(`${date}T00:00:00.000Z`, "MMM", fmt) })}</span>
                    <span className={cn("font-semibold", profitPaid ? "text-expense" : "text-income")}>+ {money(value)}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-between gap-3">
                <span className="truncate text-ink-2">{contact.name}</span>
                {/* No "after" for an amount the API would refuse. */}
                {overLimit || noneOwed ? (
                  <span className="text-ink-muted">{directionText(balanceNow)}</span>
                ) : (
                  <span>
                    <span className="text-ink-muted">{directionText(balanceNow)} → </span>
                    <span className={cn("font-bold", DIRECTION_META[loanDirection(balanceAfter)].text)}>{directionText(balanceAfter)}</span>
                  </span>
                )}
              </div>
            )}
            {chargeValue > 0 && (
              <div className="flex justify-between gap-3">
                <span className="truncate text-ink-2">{t("Charge · expense")}</span>
                <span className="font-semibold text-expense">− {money(chargeValue)}</span>
              </div>
            )}
            {wallet && walletAfter !== null && (
              <div className="flex justify-between gap-3">
                <span className="truncate text-ink-2">{accountDisplayName(wallet, displayLanguage(locale))}</span>
                <span>
                  <span className="text-ink-muted">{formatCurrency(walletBefore ?? wallet.currentBalance, currency, fmt)} → </span>
                  <span className="font-semibold text-ink">{formatCurrency(walletAfter, currency, fmt)}</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
