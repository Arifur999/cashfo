"use client";

import { CircleAlert, RotateCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { Account } from "@/lib/customer/api";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { limitMoneyDecimals } from "@/lib/customer/money";
import { listExpenseAccountsAction, listIncomeAccountsAction } from "@/lib/customer/quickEntryActions";
import { recordPurchaseAction, recordSaleAction } from "@/lib/customer/receivablesPayablesActions";
import { getAppToday } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Drawer } from "../shared/Drawer";

interface SaleDrawerProps {
  open: boolean;
  // A sale to a customer, or a purchase from a supplier, both on credit.
  kind: "sale" | "purchase";
  contact: { id: string; name: string };
  businessId: string;
  currency: string;
  onClose: () => void;
}

// Record a sale or purchase on credit: the money is owed from today and
// paid off later with Record payment.
export function SaleDrawer({ open, kind, contact, businessId, currency, onClose }: SaleDrawerProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [accountId, setAccountId] = useState("");
  // The income or expense accounts, fetched each time the drawer opens;
  // null while they load.
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  // The request failed (an outage, a timeout, no network): Try again, not
  // "Loading..." for good or a false "No income account yet".
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [isPending, startTransition] = useTransition();
  const language = displayLanguage(locale);

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAmount("");
      setDate(getAppToday());
      setDueDate("");
      setDescription("");
      setReference("");
      setAccounts(null);
      setFailed(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // The list* actions report a failed request (5xx, 429, PIN lock, timeout)
    // as success: false, so an outage shows Try again, not "No income account yet".
    (kind === "sale" ? listIncomeAccountsAction(businessId) : listExpenseAccountsAction(businessId))
      .then((result) => {
        if (cancelled) return;
        if (!result.success) {
          setFailed(true);
          return;
        }
        const list = result.data ?? [];
        setAccounts(list);
        // Purchases go to a stock or purchases account when there is one, not
        // to whatever expense account happens to come first.
        const preferred = kind === "purchase" ? list.find((account) => /stock|purchase|goods|inventory|মাল/i.test(account.name)) : undefined;
        setAccountId((current) => (list.some((account) => account.id === current) ? current : (preferred ?? list[0])?.id ?? ""));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, kind, businessId, attempt]);

  function retry() {
    setFailed(false);
    setAccounts(null);
    setAttempt((count) => count + 1);
  }

  const value = Number(amount);
  const valid = value > 0 && date.length === 10 && accountId !== "";
  const noAccounts = accounts !== null && accounts.length === 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const input = { contactId: contact.id, amount: value, date, dueDate: dueDate || undefined, description: description.trim() || undefined, referenceNo: reference.trim() || undefined, ...(kind === "sale" ? { incomeAccountId: accountId } : { expenseAccountId: accountId }) };
      const result = kind === "sale" ? await recordSaleAction(businessId, input) : await recordPurchaseAction(businessId, input);
      if (result.success) {
        toast.success(t(kind === "sale" ? "{amount} sold on credit to {name}" : "{amount} bought on credit from {name}", { amount: formatCurrency(value, currency), name: contact.name }));
        onClose();
        router.refresh();
      } else {
        toast.error(t(result.message ?? (kind === "sale" ? "Failed to record the sale" : "Failed to record the purchase")));
      }
    });
  }

  const optional = <span className="font-normal text-ink-muted"> ({t("optional")})</span>;

  return (
    <Drawer
      open={open}
      title={t(kind === "sale" ? "New sale to {name}" : "New purchase from {name}", { name: contact.name })}
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
            {t(kind === "sale" ? "Record sale" : "Record purchase")}
          </Button>
        </>
      }
    >
      <p className="rounded-md bg-strip px-4 py-3 text-small leading-relaxed text-ink-2">{t(kind === "sale" ? "Nothing is paid yet: the amount goes on what they owe you, and your income for the day. Record the payment when it comes in." : "Nothing is paid yet: the amount goes on what you owe them, and your expenses for the day. Record the payment when you make it.")}</p>
      <Field htmlFor="sale-amount" label={t(kind === "sale" ? "Amount they owe you" : "Amount you owe them")}>
        <Input id="sale-amount" size="lg" inputMode="decimal" value={amount} onChange={(event) => setAmount(limitMoneyDecimals(event.target.value))} placeholder="0.00" autoFocus className="text-h3 tabular-nums" leading={<span className="text-h3 font-semibold text-ink-2">{currencySymbol(currency)}</span>} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="sale-date" label={t("Date")}>
          <DayInput id="sale-date" size="md" value={date} onChange={setDate} max={getAppToday()} />
        </Field>
        <Field htmlFor="sale-due" label={<>{t("Due by")}{optional}</>} hint={t("Past this day it counts as overdue.")}>
          <DayInput id="sale-due" size="md" value={dueDate} onChange={setDueDate} min={date} />
        </Field>
      </div>
      <Field htmlFor="sale-note" label={<>{t(kind === "sale" ? "What was sold" : "What was bought")}{optional}</>}>
        <Input id="sale-note" size="md" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={200} placeholder={t(kind === "sale" ? "e.g. Chargers and cables, 280 pcs" : "e.g. 40 cartons of phone cases")} />
      </Field>
      {failed ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-expense-soft px-4 py-3 text-small text-expense">
          <span className="flex items-center gap-2">
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
            {t(kind === "sale" ? "The income accounts couldn't be loaded." : "The expense accounts couldn't be loaded.")}
          </span>
          <Button type="button" variant="secondary" size="sm" onClick={retry} className="pointer-coarse:h-11">
            <RotateCw />
            {t("Try again")}
          </Button>
        </div>
      ) : (
        <Field
          htmlFor="sale-account"
          label={t("Book it under")}
          hint={
            noAccounts ? (
              <>
                {t(kind === "sale" ? "No income account yet." : "No expense account yet.")}{" "}
                <Link href="/accounts" onNavigate={onClose} className="font-semibold text-emerald hover:underline">
                  {t("Add one in Accounts")}
                </Link>
              </>
            ) : (
              t(kind === "sale" ? "The income account this sale counts towards." : "The expense account this purchase counts towards: stock for goods to resell, a cost account otherwise.")
            )
          }
        >
          <NativeSelect id="sale-account" value={accountId} disabled={accounts === null || noAccounts} onChange={(event) => setAccountId(event.target.value)}>
            {accounts === null && <option value="">{t("Loading...")}</option>}
            {noAccounts && <option value="">{t(kind === "sale" ? "No income account yet." : "No expense account yet.")}</option>}
            {(accounts ?? []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.accountNumber ? `${account.accountNumber} · ` : ""}
                {accountDisplayName(account, language)}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}
      <Field htmlFor="sale-ref" label={<>{t(kind === "sale" ? "Invoice number" : "Bill number")}{optional}</>} hint={t("As it reads on the paper copy, so the two can be matched.")}>
        <Input id="sale-ref" size="md" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={40} placeholder={kind === "sale" ? "INV-0421" : "NT-2209"} className="font-mono" />
      </Field>
    </Drawer>
  );
}
