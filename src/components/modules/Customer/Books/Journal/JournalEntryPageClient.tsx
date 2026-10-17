"use client";

import { AlertTriangle, Check, Info, Plus, Save, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { accountDisplayName } from "@/lib/customer/accountDisplay";
import type { AccountGroup, LanguagePreference } from "@/lib/customer/api";
import { ACCOUNT_TYPE_META, emptyLine, flattenAccounts, journalEntries, journalTotals, type JournalLine } from "@/lib/customer/booksDisplay";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { limitMoneyDecimals } from "@/lib/customer/money";
import { createTransactionAction } from "@/lib/customer/transactionActions";
import { getAppToday } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface JournalEntryPageClientProps {
  businessId: string;
  groups: AccountGroup[];
  preferredLanguage: LanguagePreference;
  currency: string;
}

const LINE = "md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_120px_120px_36px] md:items-center md:gap-x-3";

// Books › New journal entry: a dated, referenced posting of two or more
// lines whose debits must equal their credits.
export function JournalEntryPageClient({ businessId, groups, preferredLanguage, currency }: JournalEntryPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [date, setDate] = useState(getAppToday());
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([emptyLine(), emptyLine()]);
  const [isPending, startTransition] = useTransition();
  // One key per form fill: a double click or a retried request posts once.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const totals = journalTotals(lines);
  const ready = totals.balanced && totals.complete && date.length === 10;
  const symbol = <span className="font-semibold text-ink-2">{currencySymbol(currency)}</span>;

  function update(index: number, patch: Partial<JournalLine>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function submit() {
    if (!ready || isPending) return;
    startTransition(async () => {
      const result = await createTransactionAction(businessId, { transactionType: "JOURNAL", transactionDate: date, description: description.trim() || undefined, referenceNo: reference.trim() || undefined, entries: journalEntries(lines), idempotencyKey });
      if (result.success && result.data) {
        toast.success(t("Entry saved"));
        router.push(`/transactions/${result.data.id}`);
      } else {
        toast.error(result.message ?? t("Failed to save the entry"));
      }
    });
  }

  return (
    <PageFrame className="gap-6">
      <PageHeader
        eyebrow={t("Books")}
        tone="neutral"
        title={t("New journal entry")}
        description={t("For entries that do not fit a normal sale, purchase or payment. Saved entries cannot be edited, only voided.")}
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/accounts">{t("Cancel")}</Link>
            </Button>
            <Button onClick={submit} disabled={!ready || isPending}>
              {isPending ? <Loader /> : <Save />}
              {t("Save entry")}
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_288px]">
        <Card padding="none" className="overflow-hidden">
          <div className="grid gap-4 p-5 md:grid-cols-[200px_200px_minmax(0,1fr)]">
            <Field htmlFor="je-date" label={t("Date")}>
              <Input id="je-date" size="md" type="date" value={date} onChange={(event) => setDate(event.target.value)} max={getAppToday()} />
            </Field>
            <Field htmlFor="je-ref" label={t("Reference")}>
              <Input id="je-ref" size="md" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={40} placeholder="JV-0058" className="font-mono" />
            </Field>
            <Field htmlFor="je-desc" label={t("What is this entry for?")}>
              <Input id="je-desc" size="md" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={200} placeholder={t("e.g. Shop rent for October, paid by cheque and cash")} />
            </Field>
          </div>

          <div className={cn("hidden border-t border-line bg-cream px-5 py-3 text-caption font-semibold text-ink-muted", LINE)}>
            <span>{t("Account")}</span>
            <span>{t("Line note")}</span>
            <span className="text-right">{t("Debit")}</span>
            <span className="text-right">{t("Credit")}</span>
            <span />
          </div>
          {lines.map((line, index) => (
            <div key={index} className={cn("flex flex-col gap-2 border-t border-surface-sunken px-5 py-3", LINE)}>
              <NativeSelect size="sm" value={line.accountId} onChange={(event) => update(index, { accountId: event.target.value })} aria-label={`${t("Line")} ${index + 1} ${t("account")}`} className="h-10.5">
                <option value="">{t("Pick an account")}</option>
                {groups.map((group) => (
                  <optgroup key={group.accountType} label={t(ACCOUNT_TYPE_META[group.accountType].label)}>
                    {flattenAccounts(group.accounts)
                      .filter(({ account }) => account.status === "ACTIVE")
                      .map(({ account, depth }) => (
                        <option key={account.id} value={account.id}>
                          {" ".repeat(depth * 2)}
                          {account.accountNumber ? `${account.accountNumber} · ` : ""}
                          {accountDisplayName(account, preferredLanguage)}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </NativeSelect>
              <Input size="sm" value={line.note} onChange={(event) => update(index, { note: event.target.value })} maxLength={120} placeholder={t("Line note")} aria-label={`${t("Line")} ${index + 1} ${t("note")}`} frameClassName="h-10.5" />
              <div className="grid grid-cols-2 gap-2 md:contents">
                <Input size="sm" inputMode="decimal" value={line.debit} onChange={(event) => update(index, { debit: limitMoneyDecimals(event.target.value), credit: event.target.value ? "" : line.credit })} placeholder="0" aria-label={`${t("Line")} ${index + 1} ${t("debit")}`} leading={symbol} className="text-right tabular-nums" frameClassName="h-10.5" />
                <Input size="sm" inputMode="decimal" value={line.credit} onChange={(event) => update(index, { credit: limitMoneyDecimals(event.target.value), debit: event.target.value ? "" : line.debit })} placeholder="0" aria-label={`${t("Line")} ${index + 1} ${t("credit")}`} leading={symbol} className="text-right tabular-nums" frameClassName="h-10.5" />
              </div>
              <button type="button" onClick={() => setLines((current) => current.filter((_, i) => i !== index))} disabled={lines.length <= 2} aria-label={`${t("Remove line")} ${index + 1}`} className="hidden size-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-expense disabled:opacity-30 md:flex">
                <X className="size-4" aria-hidden="true" />
              </button>
              {lines.length > 2 && (
                <button type="button" onClick={() => setLines((current) => current.filter((_, i) => i !== index))} className="w-fit text-small font-semibold text-expense md:hidden">
                  {t("Remove line")}
                </button>
              )}
            </div>
          ))}
          <div className="border-t border-surface-sunken px-5 py-3">
            <Button variant="ghost" size="sm" onClick={() => setLines((current) => [...current, emptyLine()])}>
              <Plus />
              {t("Add line")}
            </Button>
          </div>

          <div className={cn("flex flex-col gap-2 border-t border-line px-5 py-4 md:grid", LINE, totals.balanced ? "bg-mint-50" : "bg-warning-soft")}>
            <span className={cn("flex items-center gap-2 text-body font-semibold md:col-span-2", totals.balanced ? "text-emerald" : "text-warning")}>
              {totals.balanced ? <Check className="size-4" strokeWidth={2.5} aria-hidden="true" /> : <AlertTriangle className="size-4" aria-hidden="true" />}
              {totals.balanced ? t("Balanced: debits equal credits") : totals.debit + totals.credit === 0 ? t("Fill in at least two lines") : `${t("Off by")} ${formatCurrency(Math.abs(totals.difference), currency)}`}
            </span>
            <span className="flex justify-between gap-4 text-body font-bold text-ink tabular-nums md:contents">
              <span className="md:text-right">
                <span className="text-caption font-medium text-ink-muted md:hidden">{t("Debit")} </span>
                {formatCurrency(totals.debit, currency)}
              </span>
              <span className="md:text-right">
                <span className="text-caption font-medium text-ink-muted md:hidden">{t("Credit")} </span>
                {formatCurrency(totals.credit, currency)}
              </span>
            </span>
            <span className="hidden md:block" />
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <h3 className="text-h3 text-ink">{t("When to use a journal entry")}</h3>
          <p className="text-body leading-relaxed text-ink-2">{t("Most days you never need this. Sales, purchases, payments and transfers each have their own button and fill in the accounts for you.")}</p>
          <p className="text-body leading-relaxed text-ink-2">{t("Use a journal entry for the rest: one payment split across two accounts, a correction your accountant asks for, or an opening balance.")}</p>
          <p className="flex items-start gap-3 rounded-md bg-info-soft px-4 py-3 text-small leading-relaxed text-info">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{t("Debit is the account the money goes to or the cost it pays for. Credit is where it comes from.")}</span>
          </p>
        </Card>
      </div>
    </PageFrame>
  );
}
