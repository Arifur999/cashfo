"use client";

import { CircleOff, Eye, HandCoins, Plus, Printer, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { VoidTransactionDialog } from "@/components/modules/Customer/Transactions/VoidTransactionDialog";
import AmountText from "@/components/smartly/AmountText";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import EmptyState from "@/components/smartly/EmptyState";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import type { Contact, Transaction } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import type { DateRangePreset } from "@/lib/customer/dateRangePresets";
import { DIRECTION_META, LOAN_ENTRY_META, loanEntryOf, loanTotals } from "@/lib/customer/loanDisplay";
import { cancelledLabel, isCancelled, TRANSACTION_TYPE_LABELS } from "@/lib/customer/transactionDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "./ContactAvatar";
import { LoanEntryDrawer } from "./LoanEntryDrawer";

interface LoanTransactionsPageClientProps {
  businessId: string;
  transactions: Transaction[];
  // false when there were more than the page reads (see getAllTransactions).
  complete: boolean;
  loanContacts: Contact[];
  canManage: boolean;
  currency: string;
  range: DateRangePreset;
  selectedContactId: string;
}

const PERIODS: { value: DateRangePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-year", label: "This year" },
];

const GRID = "md:grid-cols-[92px_minmax(0,1fr)_140px_96px_120px_120px_170px_72px]";

// Loan payments: every loan given or taken and every repayment, with what
// each one did to the balance, and a void action on each standing entry.
export function LoanTransactionsPageClient({ businessId, transactions, complete, loanContacts, canManage, currency, range, selectedContactId }: LoanTransactionsPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Admin > System > Feature Flags: pdf_export off hides Print.
  const pdfExportOn = useFeature("pdf_export");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [voiding, setVoiding] = useState<Transaction | null>(null);

  const contactsById = new Map(loanContacts.map((contact) => [contact.id, contact]));
  const totals = loanTotals(transactions);
  const rows = transactions.map((transaction) => ({ transaction, entry: loanEntryOf(transaction), contact: transaction.contactId ? contactsById.get(transaction.contactId) : undefined }));

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`/loan-management/transactions?${params.toString()}`);
  }

  const voidingEntry = voiding ? loanEntryOf(voiding) : null;

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={t("Loans")}
        tone="loans"
        title={t("Loan payments")}
        description={t("Every loan you gave or took, and every repayment.")}
        actions={
          <>
            {pdfExportOn && transactions.length > 0 && (
              <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
                <Printer className="text-ink-2" />
                {t("Print")}
              </Button>
            )}
            {canManage && (
              <Button onClick={() => setDrawerOpen(true)}>
                <Plus strokeWidth={2.5} className="size-4" />
                {t("New loan entry")}
              </Button>
            )}
          </>
        }
      />

      {!complete && (
        <Banner tone="warning" inline icon={<TriangleAlert />}>
          {t("Showing and totalling the latest 1,000 only -- pick a shorter range to see the rest.")}
        </Banner>
      )}

      <Card padding="none" className="grid grid-cols-2 md:grid-cols-4">
        <TotalCell label={`${t("Money in")} · ${t("loans taken, money back")}`}>
          <AmountText value={totals.in} currency={currency} size="h2" tone="income" signed />
        </TotalCell>
        <TotalCell label={`${t("Money out")} · ${t("loans given, paid back")}`} divided>
          <AmountText value={-totals.out} currency={currency} size="h2" tone="expense" signed />
        </TotalCell>
        <TotalCell label={t("Net moved")} divided className="border-t md:border-t-0">
          <AmountText value={totals.in - totals.out} currency={currency} size="h2" signed />
        </TotalCell>
        <TotalCell label={t("Entries")} divided className="border-t md:border-t-0">
          <span className="text-h2 text-ink tabular-nums">{totals.count}</span>
        </TotalCell>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-6 print:hidden">
          <NativeSelect size="sm" value={selectedContactId} onChange={(event) => updateParam("contactId", event.target.value)} aria-label={t("Bank / person")} className="text-small">
            <option value="">{t("All banks & people")}</option>
            {loanContacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect size="sm" value={range} onChange={(event) => updateParam("range", event.target.value)} aria-label={t("Period")} className="text-small">
            {PERIODS.map((period) => (
              <option key={period.value} value={period.value}>
                {t(period.label)}
              </option>
            ))}
          </NativeSelect>
        </div>
        {transactions.length === 0 ? (
          <EmptyState
            bordered={false}
            tone="loans"
            icon={<HandCoins />}
            title={t("No loan entry yet")}
            description={t("Record a loan you gave or took, or a repayment, and it shows up here.")}
            action={canManage && <Button onClick={() => setDrawerOpen(true)}>{t("New loan entry")}</Button>}
            className="border-t border-line"
          />
        ) : (
          <>
            <div className={cn("hidden items-center gap-x-4 border-y border-line bg-cream px-6 py-3 text-caption text-ink-muted md:grid", GRID)}>
              <span>{t("Date")}</span>
              <span>{t("Bank / person")}</span>
              <span>{t("Entry")}</span>
              <span>{t("Category")}</span>
              <span>{t("Account")}</span>
              <span className="text-right">{t("Amount")}</span>
              <span>{t("Effect on balance")}</span>
              <span />
            </div>
            {rows.map(({ transaction, entry, contact }) => {
              const meta = entry ? LOAN_ENTRY_META[entry.kind] : null;
              const cancelled = cancelledLabel(transaction);
              const voided = isCancelled(transaction);
              const effect = meta ? DIRECTION_META[meta.effect] : null;
              const name = transaction.contact?.name ?? contact?.name ?? "—";
              return (
                <div key={transaction.id} className={cn("group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-surface-sunken px-4 py-3 text-body md:h-14.5 md:px-6 md:py-0", GRID, voided && "opacity-60")}>
                  <span className="order-3 text-caption text-ink-2 md:order-0 md:text-small">{formatDate(transaction.transactionDate)}</span>
                  <Link href={`/transactions/${transaction.id}`} className="flex min-w-0 items-center gap-3">
                    <ContactAvatar name={name} src={contact?.photoUrl} size={30} />
                    <span className="flex min-w-0 flex-col md:block">
                      <span className="truncate font-medium text-ink">{name}</span>
                      <span className="truncate text-caption font-normal text-ink-muted md:hidden">{meta ? t(meta.title) : t(TRANSACTION_TYPE_LABELS[transaction.transactionType])}</span>
                    </span>
                  </Link>
                  <span className="hidden items-center gap-2 text-small text-ink-2 md:flex">
                    <span className="truncate">{meta ? t(meta.title) : "—"}</span>
                    {cancelled && (
                      <Chip tone="expense" size="sm" className="font-semibold">
                        {t(cancelled)}
                      </Chip>
                    )}
                  </span>
                  <span className="hidden md:block">
                    <Chip tone="neutral" size="sm" className="font-bold">
                      {t("Principal")}
                    </Chip>
                  </span>
                  <span className="hidden truncate text-small text-ink-2 md:block">{entry?.wallet ?? "—"}</span>
                  <AmountText value={entry ? (meta?.flow === "in" ? entry.amount : -entry.amount) : 0} currency={currency} size="sm" signed tone={voided ? "neutral" : "auto"} className={cn("row-start-1 text-right font-semibold md:row-start-auto", voided && "text-ink-muted line-through")} />
                  <span className="hidden flex-col gap-px text-caption md:flex">
                    {meta && effect ? (
                      <>
                        <span className={cn("font-semibold", effect.text)}>
                          {t(effect.name)} {meta.effectSign} {entry && formatCurrency(entry.amount, currency)}
                        </span>
                        <span className="font-normal text-ink-muted">{t(meta.effectSub)}</span>
                      </>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </span>
                  <span className="hidden justify-end gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 md:flex print:hidden">
                    <Link href={`/transactions/${transaction.id}`} aria-label={t("View details")} title={t("View details")} className="flex size-7.5 items-center justify-center rounded-md bg-surface text-ink-2 shadow-[0_0_0_1px_var(--line)] hover:bg-cream">
                      <Eye className="size-3.75" aria-hidden="true" />
                    </Link>
                    {canManage && transaction.voidable && (
                      <button type="button" onClick={() => setVoiding(transaction)} aria-label={t("Void entry")} title={t("Void entry")} className="flex size-7.5 items-center justify-center rounded-md bg-surface text-expense shadow-[0_0_0_1px_var(--line)] hover:bg-expense-soft">
                        <CircleOff className="size-3.75" aria-hidden="true" />
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
            <div className="flex items-center justify-between px-6 py-3 text-small text-ink-muted">
              <span>
                {t("Showing")} {transactions.length} · {t("newest first")}
              </span>
            </div>
          </>
        )}
      </Card>

      <LoanEntryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} businessId={businessId} contacts={loanContacts.filter((contact) => contact.status === "ACTIVE")} currency={currency} initialContactId={selectedContactId || undefined} />
      {voiding && (
        <VoidTransactionDialog
          open
          onClose={() => setVoiding(null)}
          businessId={businessId}
          transactionId={voiding.id}
          title={t("Entry")}
          heading={t("Void this entry?")}
          description={t("The balance goes back to what it was before this entry. It stays in your history, marked as voided.")}
          confirmLabel="Void entry"
          doneLabel="Entry voided"
          detail={
            <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-cream px-4 py-3 text-body">
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-ink">{voiding.contact?.name ?? "—"}</span>
                <span className="text-caption font-normal text-ink-muted">{voidingEntry ? t(LOAN_ENTRY_META[voidingEntry.kind].title) : ""}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-px">
                <span className="font-bold text-ink tabular-nums">{formatCurrency(voidingEntry?.amount ?? 0, currency)}</span>
                <span className="text-caption font-normal text-ink-muted">{formatDate(voiding.transactionDate)}</span>
              </span>
            </div>
          }
        />
      )}
    </PageFrame>
  );
}

function TotalCell({ label, children, divided = false, className }: { label: string; children: React.ReactNode; divided?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1 px-4 py-3 md:px-5 md:py-4", divided && "md:border-l md:border-line", className)}>
      <span className="text-caption font-normal text-ink-muted">{label}</span>
      {children}
    </div>
  );
}
