"use client";

import { ChevronLeft, ChevronRight, Printer, ScrollText } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createElement } from "react";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import Input from "@/components/smartly/form/Input";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { accountDisplayName } from "@/lib/customer/accountDisplay";
import type { Account, AccountLedger, AccountSummary, LanguagePreference } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import type { DateRangePreset } from "@/lib/customer/dateRangePresets";
import { LEDGER_TYPE_TONE, ledgerDirection } from "@/lib/customer/ledger";
import { TRANSACTION_TYPE_LABELS } from "@/lib/customer/transactionDisplay";
import { walletIcon, walletPalette } from "@/lib/customer/walletVisuals";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AccountPicker } from "./AccountPicker";

interface AccountLedgerPageClientProps {
  wallets: Account[];
  others: Account[];
  account: Account | null;
  ledger: AccountLedger | null;
  summary: AccountSummary | null;
  preferredLanguage: LanguagePreference;
  currency: string;
  accountId: string;
  range: DateRangePreset;
  customFrom?: string;
  customTo?: string;
}

const PERIODS: { value: DateRangePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-year", label: "This year" },
  { value: "custom", label: "Custom" },
];

const GRID = "grid-cols-[28px_104px_96px_104px_minmax(0,1fr)_112px_112px_124px]";

// Statement: one account, the period, the equation from its opening balance
// to its closing one, and every movement in between with a running balance.
export function AccountLedgerPageClient({ wallets, others, account, ledger, summary, preferredLanguage, currency, accountId, range, customFrom, customTo }: AccountLedgerPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Admin > System > Feature Flags: pdf_export off hides Print / PDF.
  const pdfExportOn = useFeature("pdf_export");

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    router.push(`/balance/ledger?${params.toString()}`);
  }

  function setRange(value: DateRangePreset) {
    updateParams(value === "custom" ? { range: value } : { range: value === "all" ? undefined : value, dateFrom: undefined, dateTo: undefined });
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`/balance/ledger?${params.toString()}`);
  }

  const ready = account && ledger && summary;
  const adjustment = summary ? Number(summary.adjustment) : 0;
  const pageStart = ledger ? (ledger.meta.page - 1) * ledger.meta.limit : 0;

  return (
    <PageFrame className="gap-5">
      <PageHeader
        eyebrow={`${t("Money")} · ${t("Wallets")}`}
        title={t("Statement")}
        description={t("Every movement through one account, with a running balance.")}
        actions={
          pdfExportOn && (
            <Button variant="secondary" onClick={() => window.print()} disabled={!ready} title={ready ? undefined : t("Pick an account first")} className="print:hidden">
              <Printer className="text-ink-2" />
              {t("Print / PDF")}
            </Button>
          )
        }
      />

      <Card padding="none" className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-end print:hidden">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label htmlFor="ledger-account" className="text-small font-medium text-ink-2">
            {t("Account")}
          </label>
          <AccountPicker wallets={wallets} others={others} value={accountId} onChange={(id) => updateParams({ accountId: id })} preferredLanguage={preferredLanguage} currency={currency} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-small font-medium text-ink-2">{t("Period")}</span>
          <SegmentedControl options={PERIODS.map((period) => ({ value: period.value, label: t(period.label) }))} value={range} onChange={setRange} label={t("Period")} size="lg" className="max-md:w-full max-md:overflow-x-auto" />
        </div>
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <Input size="md" type="date" value={customFrom ?? ""} onChange={(event) => updateParams({ dateFrom: event.target.value })} aria-label={t("From")} max={customTo} />
            <span className="text-small text-ink-muted">{t("to")}</span>
            <Input size="md" type="date" value={customTo ?? ""} onChange={(event) => updateParams({ dateTo: event.target.value })} aria-label={t("To")} min={customFrom} />
          </div>
        )}
      </Card>

      {!ready ? (
        <Card padding="none" className="flex min-h-130 flex-col items-center justify-center gap-3 p-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-lg bg-mint-50 text-emerald">
            <ScrollText className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-2 text-h3 text-ink">{t("Pick an account to see its ledger")}</h2>
          <p className="max-w-115 text-body leading-relaxed text-ink-muted">{t("You'll see its opening balance, every movement and the running balance, ready to print.")}</p>
          {wallets.length > 0 && (
            <>
              <span className="mt-4 text-caption font-semibold text-ink-muted">{t("Your wallets")}</span>
              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:w-auto md:grid-cols-4">
                {wallets.map((wallet, index) => (
                  <button key={wallet.id} type="button" onClick={() => updateParams({ accountId: wallet.id })} className="flex h-16 items-center gap-3 rounded-md border border-line bg-surface px-4 text-left shadow-card transition-colors hover:border-line-strong md:w-50">
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", walletPalette(index).tile)}>{createElement(walletIcon(wallet), { "aria-hidden": true })}</span>
                    <span className="flex min-w-0 flex-col gap-px">
                      <span className="truncate text-body font-semibold text-ink">{accountDisplayName(wallet, preferredLanguage)}</span>
                      <span className="text-caption font-normal text-ink-muted tabular-nums">{formatCurrency(wallet.currentBalance, currency)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
          <span className="mt-2 text-caption font-normal text-ink-muted">{t("Income, expense and other accounts are in the search above.")}</span>
        </Card>
      ) : (
        <>
          <Card className="grid grid-cols-2 gap-3 md:flex md:items-stretch" aria-label={t("Opening balance plus money in, minus money out, plus transfers, equals closing balance")}>
            <EquationCell label={t("Opening balance")} value={formatCurrency(ledger.balanceBroughtForward, currency)} />
            <Operator>+</Operator>
            <EquationCell label={t("Money in")} value={formatCurrency(summary.totalIn, currency)} className="text-income" />
            <Operator>−</Operator>
            <EquationCell label={t("Money out")} value={formatCurrency(summary.totalOut, currency)} className="text-expense" />
            <Operator>±</Operator>
            <EquationCell label={t("Transfers")} value={adjustment === 0 ? formatCurrency(0, currency) : `${adjustment > 0 ? "+" : "−"} ${formatCurrency(Math.abs(adjustment), currency)}`} className="text-info" />
            <Operator equals>=</Operator>
            <div className="col-span-2 flex flex-col gap-1 rounded-md bg-mint-50 px-4 py-2 md:-my-2 md:-mr-2.5 md:flex-[1.2]">
              <span className="text-caption font-semibold text-emerald">{t("Closing balance")}</span>
              <span className="text-h2 text-ink tabular-nums">{formatCurrency(ledger.closingBalance, currency)}</span>
            </div>
          </Card>

          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-240">
                <div className={cn("grid items-center gap-x-4 border-b border-line bg-cream px-6 py-3 text-caption text-ink-muted", GRID)}>
                  <span>#</span>
                  <span>{t("Date")}</span>
                  <span>{t("Type")}</span>
                  <span>{t("Reference")}</span>
                  <span>{t("Description")}</span>
                  <span className="text-right">{t("In")}</span>
                  <span className="text-right">{t("Out")}</span>
                  <span className="text-right">{t("Balance")}</span>
                </div>
                <div className={cn("grid h-12 items-center gap-x-4 border-b border-surface-sunken bg-cream px-6 text-body", GRID)}>
                  <span />
                  <span className="col-span-6 font-semibold text-ink-2">{t("Opening balance")}</span>
                  <span className="text-right font-semibold text-ink tabular-nums">{formatCurrency(ledger.balanceBroughtForward, currency)}</span>
                </div>
                {ledger.entries.length === 0 && <p className="px-6 py-10 text-center text-body text-ink-muted">{t("No activity in this range.")}</p>}
                {ledger.entries.map((row, index) => {
                  const direction = ledgerDirection(row.entryType, account.accountType);
                  const voided = row.transactionStatus === "VOIDED";
                  const inTone = row.transactionType === "TRANSFER" ? "text-info" : "text-income";
                  return (
                    <Link key={row.entryId} href={`/transactions/${row.transactionId}`} className={cn("grid h-14 items-center gap-x-4 border-b border-surface-sunken px-6 text-body text-ink tabular-nums transition-colors hover:bg-cream", GRID, voided && "opacity-60")}>
                      <span className="text-ink-muted">{pageStart + index + 1}</span>
                      <span className="text-ink-2">{formatDate(row.date)}</span>
                      <span>
                        <Chip tone={LEDGER_TYPE_TONE[row.transactionType]} size="sm" className="font-semibold">
                          {t(TRANSACTION_TYPE_LABELS[row.transactionType])}
                        </Chip>
                      </span>
                      <span className={cn("truncate text-small", row.referenceNo ? "text-ink-2" : "text-ink-muted")}>{row.referenceNo ?? "—"}</span>
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={cn("truncate", voided && "line-through")}>{row.description ?? "—"}</span>
                        {voided && (
                          <Chip tone="expense" size="sm" className="font-semibold">
                            {t("Voided")}
                          </Chip>
                        )}
                      </span>
                      <span className={cn("text-right", direction === "in" ? inTone : "text-ink-muted")}>{direction === "in" ? formatCurrency(row.amount, currency) : "—"}</span>
                      <span className={cn("text-right", direction === "out" ? "text-expense" : "text-ink-muted")}>{direction === "out" ? formatCurrency(row.amount, currency) : "—"}</span>
                      <span className="text-right font-semibold">{formatCurrency(row.runningBalance, currency)}</span>
                    </Link>
                  );
                })}
                <div className={cn("grid h-13 items-center gap-x-4 bg-cream px-6 text-body tabular-nums", GRID)}>
                  <span />
                  <span className="col-span-4 font-bold text-ink">{t("Closing balance")}</span>
                  <span className="text-right font-semibold text-income">{formatCurrency(summary.totalIn, currency)}</span>
                  <span className="text-right font-semibold text-expense">{formatCurrency(summary.totalOut, currency)}</span>
                  <span className="text-right text-title font-bold text-ink">{formatCurrency(ledger.closingBalance, currency)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-line px-6 py-3 text-small text-ink-muted print:hidden">
              <span>
                {ledger.meta.total} {t(ledger.meta.total === 1 ? "entry" : "entries")} · {t("Page")} {ledger.meta.page} {t("of")} {Math.max(1, ledger.meta.totalPages)}
              </span>
              <div className="flex gap-2">
                <button type="button" disabled={ledger.meta.page <= 1} onClick={() => goToPage(ledger.meta.page - 1)} aria-label={t("Previous page")} className="flex size-8 items-center justify-center rounded-md border border-line bg-surface text-ink-2 disabled:opacity-50">
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </button>
                <button type="button" disabled={ledger.meta.page >= ledger.meta.totalPages} onClick={() => goToPage(ledger.meta.page + 1)} aria-label={t("Next page")} className="flex size-8 items-center justify-center rounded-md border border-line bg-surface text-ink-2 disabled:opacity-50">
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </Card>
        </>
      )}
    </PageFrame>
  );
}

function EquationCell({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col gap-1 md:flex-1">
      <span className="text-caption font-normal text-ink-muted">{label}</span>
      <span className={cn("text-h2 text-ink tabular-nums", className)}>{value}</span>
    </div>
  );
}

function Operator({ equals = false, children }: { equals?: boolean; children: React.ReactNode }) {
  return (
    <span aria-hidden="true" className={cn("hidden size-6.5 shrink-0 items-center justify-center self-center rounded-full text-body-lg font-semibold md:flex", equals ? "bg-emerald text-white" : "bg-surface-sunken text-ink-2")}>
      {children}
    </span>
  );
}
