"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { limitMoneyDecimals } from "@/lib/customer/money";
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
  const { t } = useLocale();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getAppToday());
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setAmount("");
      setDate(getAppToday());
      setDueDate("");
      setDescription("");
      setReference("");
    }
  }

  const value = Number(amount);
  const valid = value > 0 && date.length === 10;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || isPending) return;
    startTransition(async () => {
      const input = { contactId: contact.id, amount: value, date, dueDate: dueDate || undefined, description: description.trim() || undefined, referenceNo: reference.trim() || undefined };
      const result = kind === "sale" ? await recordSaleAction(businessId, input) : await recordPurchaseAction(businessId, input);
      if (result.success) {
        toast.success(`${formatCurrency(value, currency)} ${t(kind === "sale" ? "sold on credit to" : "bought on credit from")} ${contact.name}`);
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t(kind === "sale" ? "Failed to record the sale" : "Failed to record the purchase"));
      }
    });
  }

  const optional = <span className="font-normal text-ink-muted"> ({t("optional")})</span>;

  return (
    <Drawer
      open={open}
      title={`${t(kind === "sale" ? "New sale to" : "New purchase from")} ${contact.name}`}
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
      <p className="rounded-md bg-cream px-4 py-3 text-small leading-relaxed text-ink-2">{t(kind === "sale" ? "Nothing is paid yet: the amount goes on what they owe you, and your income for the day. Record the payment when it comes in." : "Nothing is paid yet: the amount goes on what you owe them, and your expenses for the day. Record the payment when you make it.")}</p>
      <Field htmlFor="sale-amount" label={t(kind === "sale" ? "Amount they owe you" : "Amount you owe them")}>
        <Input id="sale-amount" size="lg" inputMode="decimal" value={amount} onChange={(event) => setAmount(limitMoneyDecimals(event.target.value))} placeholder="0.00" autoFocus className="text-h3 tabular-nums" leading={<span className="text-h3 font-semibold text-ink-2">{currencySymbol(currency)}</span>} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="sale-date" label={t("Date")}>
          <Input id="sale-date" size="md" type="date" value={date} onChange={(event) => setDate(event.target.value)} max={getAppToday()} />
        </Field>
        <Field htmlFor="sale-due" label={<>{t("Due by")}{optional}</>} hint={t("Past this day it counts as overdue.")}>
          <Input id="sale-due" size="md" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} min={date} />
        </Field>
      </div>
      <Field htmlFor="sale-note" label={<>{t(kind === "sale" ? "What was sold" : "What was bought")}{optional}</>}>
        <Input id="sale-note" size="md" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={200} placeholder={t(kind === "sale" ? "e.g. Chargers and cables, 280 pcs" : "e.g. 40 cartons of phone cases")} />
      </Field>
      <Field htmlFor="sale-ref" label={<>{t(kind === "sale" ? "Invoice number" : "Bill number")}{optional}</>} hint={t("As it reads on the paper copy, so the two can be matched.")}>
        <Input id="sale-ref" size="md" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={40} placeholder={kind === "sale" ? "INV-0421" : "NT-2209"} className="font-mono" />
      </Field>
    </Drawer>
  );
}
