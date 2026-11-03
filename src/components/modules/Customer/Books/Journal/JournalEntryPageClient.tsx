"use client";

import { AlertTriangle, Check, Info, Lock, Plus, Save, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import Loader from "@/components/shared/Loader";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { ListCard, ListCell, ListHead, ListHeadCell, ListRow } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { accountDisplayName } from "@/lib/customer/accountDisplay";
import type { AccountGroup, LanguagePreference } from "@/lib/customer/api";
import { ACCOUNT_TYPE_META, emptyLine, flattenAccounts, hasJournalAmounts, journalEntries, journalTotals, lineNeedsAccount, type JournalLine } from "@/lib/customer/booksDisplay";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { limitMoneyDecimals } from "@/lib/customer/money";
import { createTransactionAction } from "@/lib/customer/transactionActions";
import { getAppToday } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface JournalEntryPageClientProps {
  businessId: string;
  groups: AccountGroup[];
  preferredLanguage: LanguagePreference;
  currency: string;
  // Only the owner or an accountant can post one; staff see the form set
  // back, with why.
  canManage: boolean;
}

// The lines' widths; the account and the note share what the two amounts leave.
const LINE = "md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_120px_120px_36px] md:gap-x-3";

// Option text collapses ordinary spaces, so sub-accounts indent with no-break ones.
const INDENT = "   ";

// Books › New journal entry: a dated, referenced posting of two or more
// lines whose debits must equal their credits.
export function JournalEntryPageClient({ businessId, groups, preferredLanguage, currency, canManage }: JournalEntryPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [date, setDate] = useState(getAppToday());
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<JournalLine[]>([emptyLine(), emptyLine()]);
  const [leaving, setLeaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  // One key per form fill: a double click or a retried request posts once.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const totals = journalTotals(lines);
  const ready = canManage && totals.balanced && totals.complete && date.length === 10;
  const missingAccount = lines.some(lineNeedsAccount);
  const symbol = <span className="font-semibold text-ink-2">{currencySymbol(currency, fmt)}</span>;
  const optional = <span className="font-normal text-ink-muted"> ({t("optional")})</span>;
  // A group whose accounts are all archived offers nothing to pick.
  const pickable = groups.map((group) => ({ group, rows: flattenAccounts(group.accounts).filter(({ account }) => account.status === "ACTIVE") })).filter(({ rows }) => rows.length > 0);

  // What the bar under the lines says: why Save is still off, or that the
  // entry is ready. An untouched form starts quiet: nothing is wrong yet.
  const status: { tone: "start" | "warn" | "ok"; text: string } = totals.debit + totals.credit === 0 ? { tone: "start", text: t("Fill in at least two lines") } : !totals.balanced ? { tone: "warn", text: t("Off by {amount}", { amount: formatCurrency(Math.abs(totals.difference), currency, fmt) }) } : missingAccount ? { tone: "warn", text: t("Pick an account on every line with an amount") } : !totals.complete ? { tone: "warn", text: t("Fill in at least two lines") } : { tone: "ok", text: t("Balanced: debits equal credits") };
  const statusTone = { start: { band: "bg-strip", text: "text-ink-muted" }, warn: { band: "bg-warning-soft", text: "text-warning" }, ok: { band: "bg-mint-50", text: "text-brand-ink" } }[status.tone];

  function update(index: number, patch: Partial<JournalLine>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function submit() {
    if (!ready || isPending) return;
    startTransition(async () => {
      const result = await createTransactionAction(businessId, { transactionType: "JOURNAL", transactionDate: date, description: description.trim() || undefined, referenceNo: reference.trim() || undefined, entries: journalEntries(lines), idempotencyKey });
      if (result.success && result.data) {
        toast.success(t("Entry saved@@journal"));
        router.push(`/transactions/${result.data.id}`);
      } else {
        toast.error(t(result.message ?? "Failed to save the entry"));
      }
    });
  }

  const saveButton = (className?: string) => (
    <Button onClick={submit} disabled={!ready || isPending} className={className}>
      {isPending ? <Loader /> : <Save />}
      {t("Save entry")}
    </Button>
  );
  const line = (key: string, index: number) => t(key, { number: formatCount(index + 1, fmt) });

  return (
    <PageFrame className="gap-6">
      <TopbarExtras heading={t("New journal entry")} />
      <PageHeader
        eyebrow={t("Books")}
        tone="neutral"
        title={t("New journal entry")}
        description={t("For entries that do not fit a normal sale, purchase or payment. Saved entries cannot be edited, only voided.")}
        looseDescription
        actions={
          <>
            {/* Lines with amounts aren't thrown away without asking. */}
            {hasJournalAmounts(lines) ? (
              <Button variant="secondary" onClick={() => setLeaving(true)}>
                {t("Cancel")}
              </Button>
            ) : (
              <Button variant="secondary" asChild>
                <Link href="/accounts">{t("Cancel")}</Link>
              </Button>
            )}
            {saveButton()}
          </>
        }
      />

      {!canManage && (
        <Banner tone="info" inline icon={<Lock />}>
          {t("Only the owner or an accountant can post journal entries.")}{" "}
          <Link href="/accounts" className="font-semibold underline">
            {t("See the accounts")}
          </Link>
        </Banner>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_288px]">
        <fieldset disabled={!canManage} className="min-w-0">
          <ListCard
            label={t("Lines")}
            header={
              <div className="grid gap-4 border-b border-line px-4 py-5 md:grid-cols-2 md:px-6 xl:grid-cols-[200px_200px_minmax(0,1fr)]">
                <Field htmlFor="je-date" label={t("Date")}>
                  <DayInput id="je-date" size="md" value={date} onChange={setDate} max={getAppToday()} />
                </Field>
                <Field htmlFor="je-ref" label={<>{t("Reference")}{optional}</>}>
                  <Input id="je-ref" size="md" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={40} placeholder="JV-0058" className="font-mono" />
                </Field>
                <Field htmlFor="je-desc" label={<>{t("What is this entry for?")}{optional}</>} className="md:col-span-2 xl:col-span-1">
                  <Input id="je-desc" size="md" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={200} placeholder={t("e.g. Shop rent for October, paid by cheque and cash")} />
                </Field>
              </div>
            }
            footer={
              <>
                <div className="border-t border-divider px-4 py-3 md:px-6">
                  <Button variant="ghost" size="sm" onClick={() => setLines((current) => [...current, emptyLine()])} className="pointer-coarse:h-11">
                    <Plus />
                    {t("Add line")}
                  </Button>
                </div>
                <div className={cn("flex flex-col gap-2 border-t border-line px-4 py-4 md:grid md:px-6", LINE, statusTone.band)}>
                  {/* Only the sentence is announced: the totals change on every
                      keystroke, and a button doesn't belong in a live region. */}
                  <span role="status" className={cn("flex items-center gap-2 text-body font-semibold md:col-span-2", statusTone.text)}>
                    {status.tone === "ok" ? <Check className="size-4 shrink-0" strokeWidth={2.5} aria-hidden="true" /> : status.tone === "warn" ? <AlertTriangle className="size-4 shrink-0" aria-hidden="true" /> : <Info className="size-4 shrink-0" aria-hidden="true" />}
                    {status.text}
                  </span>
                  <span className="flex justify-between gap-4 text-body font-bold text-ink tabular-nums md:contents">
                    <span className="md:text-right">
                      <span className="text-caption font-medium text-ink-muted md:hidden">{t("Debit")} </span>
                      {formatCurrency(totals.debit, currency, fmt)}
                    </span>
                    <span className="md:text-right">
                      <span className="text-caption font-medium text-ink-muted md:hidden">{t("Credit")} </span>
                      {formatCurrency(totals.credit, currency, fmt)}
                    </span>
                  </span>
                  <span className="hidden md:block" />
                  {/* On a phone the lines push the header's Save out of reach. */}
                  {saveButton("mt-1 w-full md:hidden")}
                </div>
              </>
            }
          >
            <ListHead columns={LINE}>
              <ListHeadCell>{t("Account")}</ListHeadCell>
              <ListHeadCell>{t("Line note")}</ListHeadCell>
              <ListHeadCell align="end">{t("Debit")}</ListHeadCell>
              <ListHeadCell align="end">{t("Credit")}</ListHeadCell>
              <ListHeadCell>
                <span className="sr-only">{t("Remove")}</span>
              </ListHeadCell>
            </ListHead>
            {lines.map((entry, index) => {
              const needsAccount = lineNeedsAccount(entry);
              return (
                <ListRow key={index} columns={LINE} className="max-md:flex max-md:flex-col max-md:items-stretch max-md:gap-2">
                  <ListCell>
                    <NativeSelect size="sm" value={entry.accountId} invalid={needsAccount} onChange={(event) => update(index, { accountId: event.target.value })} aria-label={line("Line {number} account", index)} className="h-10.5" frameClassName="w-full">
                      <option value="">{t("Pick an account")}</option>
                      {pickable.map(({ group, rows }) => (
                        <optgroup key={group.accountType} label={t(ACCOUNT_TYPE_META[group.accountType].label)}>
                          {rows.map(({ account, depth }) => (
                            <option key={account.id} value={account.id}>
                              {INDENT.repeat(depth)}
                              {account.accountNumber ? `${account.accountNumber} · ` : ""}
                              {accountDisplayName(account, preferredLanguage)}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </NativeSelect>
                  </ListCell>
                  <ListCell>
                    <Input size="sm" value={entry.note} onChange={(event) => update(index, { note: event.target.value })} maxLength={120} placeholder={t("Line note")} aria-label={line("Line {number} note", index)} frameClassName="h-10.5" />
                  </ListCell>
                  <div className="grid grid-cols-2 gap-2 md:contents">
                    {/* Below md the column heads are hidden, so each amount
                        names itself; the input's aria-label already does. */}
                    <ListCell className="flex flex-col gap-1 md:block">
                      <span aria-hidden="true" className="text-caption font-medium text-ink-muted md:hidden">
                        {t("Debit")}
                      </span>
                      <Input size="sm" inputMode="decimal" value={entry.debit} onChange={(event) => update(index, { debit: limitMoneyDecimals(event.target.value), credit: event.target.value ? "" : entry.credit })} placeholder="0" aria-label={line("Line {number} debit", index)} leading={symbol} className="text-right tabular-nums" frameClassName="h-10.5" />
                    </ListCell>
                    <ListCell className="flex flex-col gap-1 md:block">
                      <span aria-hidden="true" className="text-caption font-medium text-ink-muted md:hidden">
                        {t("Credit")}
                      </span>
                      <Input size="sm" inputMode="decimal" value={entry.credit} onChange={(event) => update(index, { credit: limitMoneyDecimals(event.target.value), debit: event.target.value ? "" : entry.debit })} placeholder="0" aria-label={line("Line {number} credit", index)} leading={symbol} className="text-right tabular-nums" frameClassName="h-10.5" />
                    </ListCell>
                  </div>
                  <ListCell className="flex md:justify-center">
                    <button type="button" onClick={() => setLines((current) => current.filter((_, i) => i !== index))} disabled={lines.length <= 2} aria-label={line("Remove line {number}", index)} className="hidden size-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-expense disabled:opacity-30 md:flex">
                      <X className="size-4" aria-hidden="true" />
                    </button>
                    {lines.length > 2 && (
                      <button type="button" onClick={() => setLines((current) => current.filter((_, i) => i !== index))} className="-ml-2 flex min-h-11 w-fit items-center px-2 text-small font-semibold text-expense md:hidden">
                        {t("Remove line")}
                      </button>
                    )}
                  </ListCell>
                </ListRow>
              );
            })}
          </ListCard>
        </fieldset>

        <Card className="flex flex-col gap-3">
          <h2 className="text-h3 text-ink">{t("When to use a journal entry")}</h2>
          <p className="text-body leading-relaxed text-ink-2">{t("Most days you never need this. Sales, purchases, payments and transfers each have their own button and fill in the accounts for you.")}</p>
          <p className="text-body leading-relaxed text-ink-2">{t("Use a journal entry for the rest: one payment split across two accounts, a correction your accountant asks for, or an opening balance.")}</p>
          <p className="flex items-start gap-3 rounded-md bg-info-soft px-4 py-3 text-small leading-relaxed text-info">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{t("Debit is the account the money goes to or the cost it pays for. Credit is where it comes from.")}</span>
          </p>
        </Card>
      </div>

      <ConfirmDialog open={leaving} onClose={() => setLeaving(false)} onConfirm={() => router.push("/accounts")} danger title={t("Leave this entry?")} description={t("The lines you filled in will be lost. Nothing has been saved yet.")} confirmLabel={t("Leave without saving")} cancelLabel={t("Keep editing")} />
    </PageFrame>
  );
}
