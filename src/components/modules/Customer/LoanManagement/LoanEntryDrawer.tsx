"use client";

import { ArrowDownLeft, ArrowUpRight, Percent, WifiOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { useOnline } from "@/components/modules/Customer/Layout/useOnline";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import { WalletPicker } from "@/components/modules/Customer/Shared/WalletPicker";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { useAmountField } from "@/hooks/useAmountField";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account, Contact } from "@/lib/customer/api";
import { getBudgetCategoryNamesAction } from "@/lib/customer/budgetActions";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { balanceAfterEntry, DIRECTION_META, hasProfitCategory, LOAN_ENTRY_KINDS, LOAN_ENTRY_META, loanDirection, loanErrorText, profitCategory, repaymentLimit, walletDeltaOf, type LoanBalanceDetail, type LoanEdit, type LoanEntryKind } from "@/lib/customer/loanDisplay";
import { correctTransactionAction, createExpenseAction, createIncomeAction, getExpenseAccountsAction, listMoneyAccountsAction } from "@/lib/customer/quickEntryActions";
import { undoEditAction, voidTransactionAction } from "@/lib/customer/transactionActions";
import { DELETED_REASON } from "@/lib/customer/transactionDisplay";
import { correctLoanEntryAction, getContactBalanceDetailAction, payPaymentAction, receivePaymentAction, recordPurchaseAction, recordSaleAction } from "@/lib/customer/receivablesPayablesActions";
import { getAppToday } from "@/lib/date";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ContactPicker } from "./ContactPicker";
import { offerUndo } from "./offerUndo";
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
type Errors = Partial<Record<"contact" | "purpose" | "what" | "account" | "date" | "amount", string>>;

const PURPOSES: Purpose[] = ["PRINCIPAL", "PROFIT"];
const PROFIT_WAYS: ProfitWay[] = ["PAID", "RECEIVED"];
const PICKER_ID = "loan-who";
const LABEL = "text-[13px] font-semibold text-ink-2 leading-[normal]";
// The board's choice cards: a 1.5px edge, the brand colour once picked.
const CHOICE = "flex rounded-[12px] border-[1.5px] px-3 py-2.25 text-left leading-[normal] transition-colors";
const choiceTone = (on: boolean, error: boolean) => (on ? "border-emerald bg-emerald-soft" : error ? "border-expense-line bg-surface hover:border-input" : "border-line bg-surface hover:border-input");

// The repayment a contact's detail tells the cap of, by kind.
const REPAYMENTS: Partial<Record<LoanEntryKind, { over: string; none: string; noneSub: string }>> = {
  RECEIVE_PAYMENT: { over: "They owe you {amount} at most", none: "Nothing to get back: they don't owe you anything right now.", noneSub: "Nothing to get back" },
  MAKE_PAYMENT: { over: "You owe them {amount} at most", none: "Nothing to pay back: you don't owe them anything right now.", noneSub: "Nothing to pay back" },
};
const PROFIT_META: Record<ProfitWay, { title: string; sub: string; flow: "in" | "out" }> = {
  PAID: { title: "I paid profit or interest", sub: "Money out · balance stays the same", flow: "out" },
  RECEIVED: { title: "I received profit or interest", sub: "Money in · balance stays the same", flow: "in" },
};

// New loan entry (LoanTransactions board's popup): who, whether it is the
// loan itself or its profit, what happened, through which account and on
// which day, how much -- and what both balances will be once it is saved.
// The checks run on Save and are said under each field. Profit never moves
// the loan; a repayment can't be more than is owed on its side, and money
// out can't be more than the account holds.
export function LoanEntryDrawer({ open, onClose, businessId, contacts, currency, initialContactId, initialKind, editing = null }: LoanEntryDrawerProps) {
  const { t, locale, fmt } = useLocale();
  const router = useRouter();
  const online = useOnline();
  const amountId = useId();
  const groupId = useId();
  const [contactId, setContactId] = useState("");
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [kind, setKind] = useState<LoanEntryKind | null>(null);
  // Profit: I paid it (an expense) or I received it (an income).
  const [profitWay, setProfitWay] = useState<ProfitWay | null>(null);
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<{ EXPENSE: string[]; INCOME: string[] }>({ EXPENSE: [], INCOME: [] });
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [amount, setAmount] = useState("");
  const amountField = useAmountField(amount, setAmount, currency);
  // A bank or service charge paid with it, out of the same account.
  const [charge, setCharge] = useState("");
  const chargeField = useAmountField(charge, setCharge, currency);
  const [showCharge, setShowCharge] = useState(false);
  // The slip or loan number, or a word about it (the statement's Note /
  // reference).
  const [reference, setReference] = useState("");
  const [wallets, setWallets] = useState<Account[]>([]);
  const [walletsError, setWalletsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // What the picked contact owes on each side, for the repayment cap; read
  // again after each save, since the save changed it.
  const [detail, setDetail] = useState<{ contactId: string; data: LoanBalanceDetail | null } | null>(null);
  const [saves, setSaves] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && editing) {
      // The entry as it was saved.
      setContactId(editing.contactId);
      setPurpose(editing.profit ? "PROFIT" : "PRINCIPAL");
      setKind(editing.kind ?? null);
      setProfitWay(editing.profit ? (editing.profit.paid ? "PAID" : "RECEIVED") : null);
      setCategory(editing.profit?.category ?? "");
      setAmount(String(editing.amount));
      setCharge(editing.charge ? String(editing.charge) : "");
      setShowCharge(!!editing.charge);
      setReference(editing.reference);
      setDate(editing.date);
      setAccountId(editing.accountId);
    } else if (open) {
      // Whoever the page opened it for, or the only one there is; never
      // whoever happens to sort first. Nothing else is picked for you.
      setContactId(initialContactId && contacts.some((c) => c.id === initialContactId) ? initialContactId : contacts.length === 1 ? contacts[0].id : "");
      setPurpose(initialKind ? "PRINCIPAL" : null);
      setKind(initialKind ?? null);
      setProfitWay(null);
      setCategory("");
      setAmount("");
      setCharge("");
      setShowCharge(false);
      setReference("");
      setDate(getAppToday());
      setAccountId("");
    }
    if (open) {
      setErrors({});
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
        // The only account there is; with more, the customer picks.
        setAccountId((picked) => picked || (list.length === 1 ? list[0].id : ""));
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
  const profit = purpose === "PROFIT";
  const profitPaid = profitWay === "PAID";
  const profitType = profitPaid ? "EXPENSE" : "INCOME";
  const options = categories[profitType];
  const picked = category && options.includes(category) ? category : profitCategory(options);
  // The board files profit without asking. The category is asked only when
  // none is named for profit (the first one would be a guess) or an edit
  // keeps another one, so money never lands somewhere unseen.
  const askCategory = options.length > 0 && (!hasProfitCategory(options) || (!!editing && picked !== profitCategory(options)));
  // An expense posts against a real expense account; the category is its
  // label (the New transaction drawer's rule).
  const expenseAccountId = expenseAccounts.find((a) => a.name.toLowerCase().includes(picked.toLowerCase()))?.id ?? expenseAccounts[0]?.id ?? "";
  const value = Number(amount) || 0;
  const chargeValue = Number(charge) || 0;
  const money = (figure: number) => formatCurrency(figure, currency, fmt);
  // What happened, once it is picked for the purpose shown.
  const principalKind = !profit && purpose ? kind : null;
  const way = profit ? profitWay : null;
  const known = !!principalKind || !!way;
  const flowIn = way ? PROFIT_META[way].flow === "in" : principalKind ? LOAN_ENTRY_META[principalKind].flow === "in" : false;
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
  const repayment = principalKind ? REPAYMENTS[principalKind] : undefined;
  const limit = principalKind && repayment ? limitOf(principalKind) : null;
  const checkingLimit = !!repayment && !!contact && contactDetail === undefined;

  const walletBefore = wallet ? Number(wallet.currentBalance) - editedWallet : null;
  const walletAfter = walletBefore !== null && known ? walletBefore + (flowIn ? value : -value) - chargeValue : null;
  const balanceNow = contact ? Number(contact.currentBalance) - editedPrincipal : 0;
  const balanceAfter = principalKind ? balanceAfterEntry(balanceNow, principalKind, value) : balanceNow;
  const canSave = online && !isPending && !checkingLimit;
  const accountLabel = !known ? "Account" : flowIn ? "Money came into" : "Money went from";
  const fallback = profit ? "Couldn't save the profit entry" : principalKind === "GIVE_LOAN" || principalKind === "TAKE_LOAN" ? "Couldn't save the loan" : "Couldn't save the payment";

  const directionText = (balance: number) => {
    const direction = loanDirection(balance);
    return direction === "SETTLED" ? t("Settled") : `${t(DIRECTION_META[direction].name)} ${money(Math.abs(balance))}`;
  };

  // The board's checks, each said under its field.
  function check(): Errors {
    const found: Errors = {};
    if (!contact) found.contact = t("Pick the bank or person.");
    if (!purpose) found.purpose = t("Pick what the money is for.");
    if (!known) found.what = t("Pick what happened.");
    else if (profit && profitPaid && !expenseAccountId) found.what = t("Add an expense category first, to file the profit under.");
    if (!accountId) found.account = t("Pick the account.");
    if (!date) found.date = t("Pick a date.");
    else if (date > getAppToday()) found.date = t("The date can’t be in the future.");
    if (!amount.trim()) found.amount = t("Enter the amount.");
    else if (!(value > 0)) found.amount = t("The amount must be more than 0.");
    else if (repayment && limit === 0) found.amount = t(repayment.none);
    else if (repayment && limit !== null && value > limit + 0.005) found.amount = t(repayment.over, { amount: money(limit) });
    else if (wallet && known && !flowIn && walletBefore !== null && value + chargeValue > walletBefore + 0.005) found.amount = t("{account} has only {amount}.", { account: accountDisplayName(wallet, displayLanguage(locale)), amount: money(Math.max(0, walletBefore)) });
    return found;
  }

  function save(another: boolean) {
    if (!canSave) return;
    const found = check();
    setErrors(found);
    if (Object.keys(found).length > 0 || !purpose) return;
    startTransition(async () => {
      try {
        const referenceNo = reference.trim() || undefined;
        const charged = chargeValue > 0 ? chargeValue : undefined;
        const base = { contactId, amount: value, date, referenceNo, moneyAccountId: accountId, charge: charged };
        const filed = { contactId, amount: value, date, referenceNo, categoryId: picked || undefined, charge: charged };
        // Edit keeps the kind: a principal entry stays one, profit stays profit.
        const result = profit
          ? editing
            ? await correctTransactionAction(businessId, editing.transactionId, profitPaid ? "EXPENSE" : "INCOME", profitPaid ? { ...filed, fromAccountId: accountId, expenseAccountId } : { ...filed, toAccountId: accountId })
            : profitPaid
              ? await createExpenseAction(businessId, { ...filed, fromAccountId: accountId, expenseAccountId })
              : await createIncomeAction(businessId, { ...filed, toAccountId: accountId })
          : editing
            ? await correctLoanEntryAction(businessId, editing.transactionId, principalKind!, base)
            : principalKind === "GIVE_LOAN"
              ? await recordSaleAction(businessId, base)
              : principalKind === "TAKE_LOAN"
                ? await recordPurchaseAction(businessId, base)
                : principalKind === "RECEIVE_PAYMENT"
                  ? await receivePaymentAction(businessId, base)
                  : await payPaymentAction(businessId, base);
        if (!result.success) {
          toast.error(loanErrorText(result.message, fallback, t, money));
          return;
        }
        // Undo, as every save on the board offers: an edit goes back to the
        // entry it replaced, a new entry is deleted again.
        const savedId = result.data?.id;
        const message = editing ? t("Entry updated") : t("Entry saved for {name}", { name: contact?.name ?? "" });
        if (savedId) {
          offerUndo({
            message,
            run: () => (editing ? undoEditAction(businessId, savedId) : voidTransactionAction(businessId, savedId, DELETED_REASON)),
            done: editing ? t("Change undone") : t("Entry removed"),
            failed: editing ? t("Couldn't undo the change") : t("Couldn't remove the entry"),
            undoLabel: t("Undo"),
            refresh: () => router.refresh(),
          });
        } else {
          toast.success(message);
        }
        router.refresh();
        // The old detail is stale now: until the fresh one is in, the cap
        // reads as being checked and Save waits, rather than allowing
        // what was owed before this entry.
        setDetail(null);
        setSaves((count) => count + 1);
        if (another) {
          // The board's next entry: the same day, everything else fresh.
          setContactId("");
          setPurpose(null);
          setKind(null);
          setProfitWay(null);
          setAmount("");
          setCharge("");
          setShowCharge(false);
          setReference("");
          setAccountId("");
          // The entry is saved: a wallet refresh that fails keeps the old
          // figures rather than reading as a failed save, inviting a second one.
          const fresh = await listMoneyAccountsAction(businessId).catch(() => null);
          if (fresh?.success && fresh.data) setWallets(fresh.data);
          document.getElementById(PICKER_ID)?.focus();
        } else {
          onClose();
        }
      } catch {
        // The request never got there (offline, timed out): the popup and
        // what was typed stay, rather than the page's error screen.
        toast.error(t("Couldn't save. Check your connection and try again."));
      }
    });
  }

  // Where focus starts: the amount once someone is picked, else the picker.
  function focusFirst(event: Event) {
    const target = document.getElementById(contactId && known ? amountId : PICKER_ID);
    if (!target || (target as HTMLButtonElement).disabled) return;
    event.preventDefault();
    target.focus();
  }

  const peopleLink = (
    <Link href="/loan-management/bank-person-list" onNavigate={onClose} className="font-semibold text-emerald hover:underline">
      {t("Contacts")}
    </Link>
  );
  const errorLine = (key: keyof Errors) =>
    errors[key] && (
      <span id={`${groupId}-${key}-error`} role="alert" className="text-[12.5px] text-expense">
        {errors[key]}
      </span>
    );
  const pickPurpose = (next: Purpose) => {
    setPurpose(next);
    setErrors((now) => ({ ...now, purpose: undefined, what: undefined }));
  };

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      width={560}
      busy={isPending}
      onSubmit={(event) => {
        event.preventDefault();
        save(false);
      }}
      onOpenAutoFocus={focusFirst}
      headClassName="items-center pt-4 pr-5 pb-3.5 pl-6"
      titleClassName="text-[18px] font-bold"
      closeClassName="my-0 bg-surface-sunken text-ink-soft hover:bg-line"
      bodyClassName="gap-4 px-6 py-4.5"
      footerClassName="px-6"
      title={t(editing ? "Edit loan entry" : "New loan entry")}
      footer={
        <div className="flex w-full flex-col gap-2">
          {!online && (
            <p role="status" className="flex items-center gap-2 text-caption text-warning">
              <WifiOff className="size-3.5 shrink-0" aria-hidden="true" />
              {t("You're offline. Saving waits until the internet is back.")}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            {!editing && (
              <Button type="button" variant="secondary" size="lg" onClick={() => save(true)} disabled={!canSave} className="px-4 max-sm:order-2 max-sm:flex-1">
                {t("Save & add another")}
              </Button>
            )}
            <span className="flex-1 max-sm:hidden" />
            <Button type="button" variant="ghost" size="lg" onClick={onClose} className="px-4 text-ink-2 max-sm:hidden">
              {t("Cancel")}
            </Button>
            <Button type="submit" size="lg" disabled={!canSave} className="px-5.5 max-sm:order-1 max-sm:w-full">
              {isPending && <Loader size={16} onDark label={t("Loading...")} />}
              {editing ? t("Save changes") : t("Save entry")}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={PICKER_ID} className={LABEL}>
          {t("Bank / person")}
        </label>
        <ContactPicker
          id={PICKER_ID}
          contacts={contacts}
          value={contactId}
          onChange={(next) => {
            setContactId(next);
            setErrors((now) => ({ ...now, contact: undefined, amount: undefined }));
          }}
          currency={currency}
          size="xl"
          label={t("Bank / person")}
          invalid={!!errors.contact}
          describedBy={errors.contact ? `${groupId}-contact-error` : undefined}
        />
        {errorLine("contact")}
        {contacts.length === 0 && <p className="text-caption text-ink-muted">{fillNodes(t("Add a bank or person first, from {page}."), { page: peopleLink })}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <span id={`${groupId}-purpose`} className={LABEL}>
          {t("What is this money for?")}
        </span>
        <div role="radiogroup" aria-labelledby={`${groupId}-purpose`} aria-describedby={errors.purpose ? `${groupId}-purpose-error` : undefined} className="grid grid-cols-2 gap-2">
          {(
            [
              { value: "PRINCIPAL", title: "Principal", sub: "Changes the balance" },
              { value: "PROFIT", title: "Profit / interest", sub: "Balance stays the same" },
            ] as const
          ).map((option) => {
            const on = option.value === purpose;
            return (
              <button
                key={option.value}
                {...radioProps<Purpose | "">(option.value, { values: PURPOSES, value: purpose ?? "", onChange: (next) => next && pickPurpose(next), disabled: (candidate) => !!editing && candidate !== purpose })}
                className={cn(CHOICE, "flex-col gap-px", choiceTone(on, !!errors.purpose))}
              >
                <span className={cn("text-[13.5px] font-semibold", on ? "text-emerald" : "text-ink")}>{t(option.title)}</span>
                <span className="text-[12px] text-ink-muted">{t(option.sub)}</span>
              </button>
            );
          })}
        </div>
        {errorLine("purpose")}
      </div>

      <div className="flex flex-col gap-1.5">
        <span id={`${groupId}-what`} className={LABEL}>
          {t("What happened?")}
        </span>
        {!purpose ? (
          <span className="rounded-[12px] border-[1.5px] border-dashed border-line p-3 text-center text-[12.5px] leading-[normal] text-ink-faint">{t("Pick what the money is for first.")}</span>
        ) : profit ? (
          <div role="radiogroup" aria-labelledby={`${groupId}-what`} aria-describedby={errors.what ? `${groupId}-what-error` : undefined} className="grid grid-cols-2 gap-2">
            {PROFIT_WAYS.map((option) => {
              const on = option === profitWay;
              const out = PROFIT_META[option].flow === "out";
              return (
                <button
                  key={option}
                  {...radioProps<ProfitWay | "">(option, { values: PROFIT_WAYS, value: profitWay ?? "", onChange: (next) => next && setProfitWay(next), disabled: (candidate) => !!editing && candidate !== profitWay })}
                  className={cn(CHOICE, "items-start gap-2", choiceTone(on, !!errors.what))}
                >
                  <WhatIcon out={out} />
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className={cn("text-[13.5px] font-semibold", on ? "text-emerald" : "text-ink")}>{t(PROFIT_META[option].title)}</span>
                    <span className="text-[12px] text-ink-muted">{t(PROFIT_META[option].sub)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div role="radiogroup" aria-labelledby={`${groupId}-what`} aria-describedby={errors.what ? `${groupId}-what-error` : undefined} className="grid grid-cols-2 gap-2">
            {LOAN_ENTRY_KINDS.map((option) => {
              const on = option === kind;
              const out = LOAN_ENTRY_META[option].flow === "out";
              // Nothing owed on that side: it shows, with why, but can't be picked.
              const none = limitOf(option) === 0;
              const blocked = none || (!!editing && option !== kind);
              return (
                <button
                  key={option}
                  {...radioProps<LoanEntryKind | "">(option, { values: LOAN_ENTRY_KINDS, value: kind ?? "", onChange: (next) => next && setKind(next), disabled: (candidate) => candidate !== kind && (!!editing || limitOf(candidate as LoanEntryKind) === 0) })}
                  className={cn(CHOICE, "items-start gap-2", choiceTone(on, !!errors.what), blocked && !on && "cursor-not-allowed opacity-60 hover:border-line")}
                >
                  <WhatIcon out={out} />
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className={cn("text-[13.5px] font-semibold", on ? "text-emerald" : "text-ink")}>{t(LOAN_ENTRY_META[option].title)}</span>
                    <span className="text-[12px] text-ink-muted">{none ? t(REPAYMENTS[option]?.noneSub ?? "") : t(LOAN_ENTRY_META[option].sub)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {errorLine("what")}
      </div>

      {profit && profitWay && askCategory && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="loan-category" className={LABEL}>
            {t(profitPaid ? "Expense category" : "Income category")}
          </label>
          <span className="relative flex min-w-0">
            <span aria-hidden="true" className={cn("pointer-events-none absolute top-1/2 left-3 z-1 flex size-6.5 -translate-y-1/2 items-center justify-center rounded-sm", profitPaid ? "bg-warning-soft text-warning" : "bg-mint-50 text-emerald")}>
              <Percent className="size-3.5" strokeWidth={2.25} />
            </span>
            <NativeSelect id="loan-category" size="md" value={picked} onChange={(event) => setCategory(event.target.value)} disabled={options.length === 0} frameClassName="w-full rounded-[12px]" className="pl-12 font-semibold">
              {options.length === 0 && <option value="">{t(loading ? "Loading..." : "No categories yet")}</option>}
              {options.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </NativeSelect>
          </span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <WalletPicker
            label={t(accountLabel)}
            size="popup"
            wallets={wallets}
            value={accountId}
            onChange={(next) => {
              setAccountId(next);
              setErrors((now) => ({ ...now, account: undefined, amount: undefined }));
            }}
            after={walletAfter}
            // Money coming in can land in an account below zero; money going
            // out needs one with something in it.
            minBalance={known && !flowIn ? 0 : Number.NEGATIVE_INFINITY}
            currency={currency}
            loading={loading}
            error={walletsError}
            onClose={onClose}
            placeholder={t("Select an account")}
            invalid={!!errors.account}
            describedBy={errors.account ? `${groupId}-account-error` : undefined}
          />
          {errorLine("account")}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="loan-date" className={LABEL}>
            {t("Date")}
          </label>
          <DayInput id="loan-date" size="lg" value={date} onChange={setDate} max={getAppToday()} invalid={!!errors.date} className="h-11.5 gap-2 rounded-[12px]" />
          {errorLine("date")}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={amountId} className={LABEL}>
            {t("Amount")}
          </label>
          <Input
            id={amountId}
            type="text"
            inputMode="decimal"
            size="lg"
            {...amountField}
            placeholder="0"
            invalid={!!errors.amount}
            aria-describedby={errors.amount ? `${groupId}-amount-error` : undefined}
            leading={<span className="text-[15px] font-semibold text-ink-faint">{currencySymbol(currency, fmt)}</span>}
            frameClassName="h-11.5 gap-1.5 rounded-[12px] px-3"
            className="text-[16px] font-bold tabular-nums"
          />
          {errorLine("amount")}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="loan-ref" className={LABEL}>
            {t("Note or reference (optional)")}
          </label>
          <Input id="loan-ref" size="lg" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={120} placeholder={t(profit ? "e.g. Sep profit · slip 4471" : "e.g. Loan no. BL-2231")} frameClassName="h-11.5 rounded-[12px] px-3" />
        </div>
      </div>

      {/* Not on the board: shown only to edit an entry that has a charge,
          so its money stays in sight and can be changed. */}
      {showCharge && (
        <div className="-mt-1 flex flex-col gap-1.5">
          <label htmlFor="loan-charge" className={LABEL}>
            {t("Charge")} <span className="font-normal text-ink-muted">({t("optional")})</span>
          </label>
          <div className="flex items-center gap-2.5">
            <Input id="loan-charge" type="text" inputMode="decimal" size="md" {...chargeField} placeholder="0" leading={<span className="text-[14px] font-semibold text-ink-faint">{currencySymbol(currency, fmt)}</span>} frameClassName="w-40 gap-1.5 rounded-[12px] px-3" className="tabular-nums" />
            <span className="text-caption text-ink-muted">{t("Paid from the same wallet, as an expense")}</span>
          </div>
        </div>
      )}

      {contact && known && wallet && value > 0 && !errors.amount && (
        <div aria-live="polite" className="flex flex-col gap-2 rounded-[14px] border border-line bg-strip px-3.5 py-3 text-[13px] tabular-nums">
          <span className="text-[11.5px] font-semibold tracking-[0.04em] text-ink-muted uppercase">{t("After this")}</span>
          <div className="flex justify-between gap-2.5">
            <span className="truncate text-ink-2">{contact.name}</span>
            <span className="whitespace-nowrap">
              <span className="text-ink-muted">{directionText(balanceNow)} → </span>
              {profit ? <b className="font-bold text-ink-muted">{t("no change")}</b> : <b className={cn("font-bold", DIRECTION_META[loanDirection(balanceAfter)].text)}>{directionText(balanceAfter)}</b>}
            </span>
          </div>
          {chargeValue > 0 && (
            <div className="flex justify-between gap-2.5">
              <span className="truncate text-ink-2">{t("Charge · expense")}</span>
              <b className="font-bold text-expense">− {money(chargeValue)}</b>
            </div>
          )}
          {walletAfter !== null && (
            <div className="flex justify-between gap-2.5">
              <span className="truncate text-ink-2">{accountDisplayName(wallet, displayLanguage(locale))}</span>
              <span className="whitespace-nowrap">
                <span className="text-ink-muted">{formatCurrency(walletBefore ?? wallet.currentBalance, currency, fmt)} → </span>
                <b className="font-bold text-ink">{formatCurrency(walletAfter, currency, fmt)}</b>
              </span>
            </div>
          )}
        </div>
      )}
    </PopupDialog>
  );
}

// The way the money went: out up and to the right in red, in down and to
// the left in the brand colour.
function WhatIcon({ out }: { out: boolean }) {
  return out ? <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-expense-fill" strokeWidth={2.25} aria-hidden="true" /> : <ArrowDownLeft className="mt-0.5 size-4 shrink-0 text-emerald" strokeWidth={2.25} aria-hidden="true" />;
}
