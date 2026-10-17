"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import type { Account, AccountLedger, AccountSummary } from "@/lib/customer/api";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { ledgerDirection } from "@/lib/customer/ledger";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BalanceText } from "../shared/BalanceText";

interface LedgerTableProps {
  account: Account;
  ledger: AccountLedger;
  summary: AccountSummary;
  currency: string;
  // The first day of the period; empty for all time.
  from?: string;
  onPage: (page: number) => void;
}

const GRID = "md:grid md:grid-cols-[110px_minmax(0,1fr)_100px_120px_120px_130px] md:items-center md:gap-x-4";

// Every movement through the account in the period, oldest first, with the
// running balance; the opening balance leads and the totals close it.
export function LedgerTable({ account, ledger, summary, currency, from, onPage }: LedgerTableProps) {
  const { t } = useLocale();
  const change = Number(ledger.closingBalance) - Number(ledger.balanceBroughtForward);
  const adjustment = Number(summary.adjustment);
  const sum = [`${formatCurrency(summary.totalIn, currency)} − ${formatCurrency(summary.totalOut, currency)}`, adjustment !== 0 ? `${adjustment > 0 ? "+" : "−"} ${formatCurrency(Math.abs(adjustment), currency)}` : null].filter(Boolean).join(" ");
  const dash = <span className="text-ink-muted">—</span>;

  return (
    <Card padding="none" className="overflow-hidden">
      <div className={cn("hidden bg-cream px-5 py-3 text-caption font-semibold text-ink-muted", GRID)}>
        <span>{t("Date")}</span>
        <span>{t("Description")}</span>
        <span>{t("Reference")}</span>
        <span className="text-right">{t("Money in")}</span>
        <span className="text-right">{t("Money out")}</span>
        <span className="text-right">{t("Balance")}</span>
      </div>
      <div className={cn("flex min-h-14 items-center justify-between gap-3 border-t border-surface-sunken bg-cream px-5 py-2 text-body", GRID)}>
        <span className="hidden text-small whitespace-nowrap text-ink-2 md:block">{from ? formatDate(from, "EEE, d MMM") : ""}</span>
        <span className="font-medium text-ink-muted">{t("Opening balance")}</span>
        <span className="hidden md:block" />
        <span className="hidden text-right md:block">{dash}</span>
        <span className="hidden text-right md:block">{dash}</span>
        <BalanceText value={ledger.balanceBroughtForward} currency={currency} className="font-semibold md:text-right" />
      </div>
      {ledger.entries.length === 0 && <p className="border-t border-surface-sunken px-5 py-10 text-center text-body text-ink-muted">{t("No entries in this period.")}</p>}
      {ledger.entries.map((row) => {
        const direction = ledgerDirection(row.entryType, account.accountType);
        const voided = row.transactionStatus === "VOIDED";
        const amount = direction === "in" ? <span className="font-bold text-income tabular-nums whitespace-nowrap">{formatSignedCurrency(row.amount, currency)}</span> : <span className="font-bold text-expense tabular-nums whitespace-nowrap">{formatSignedCurrency(-Number(row.amount), currency)}</span>;
        return (
          <Link key={row.entryId} href={`/transactions/${row.transactionId}`} className={cn("flex min-h-14 items-center justify-between gap-3 border-t border-surface-sunken px-5 py-2 text-body transition-colors hover:bg-cream/60", GRID, voided && "opacity-60")}>
            <span className="flex min-w-0 flex-col md:contents">
              <span className="text-small whitespace-nowrap text-ink-2 max-md:text-caption max-md:text-ink-muted">{formatDate(row.date, "EEE, d MMM")}</span>
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn("truncate font-semibold text-ink", voided && "line-through")}>{row.description ?? t("No description")}</span>
                {voided && (
                  <Chip tone="expense" size="sm">
                    {t("Voided")}
                  </Chip>
                )}
              </span>
              <span className={cn("font-mono text-caption text-ink-muted", !row.referenceNo && "hidden md:block")}>{row.referenceNo ?? ""}</span>
            </span>
            <span className="hidden text-right md:block">{direction === "in" ? amount : dash}</span>
            <span className="hidden text-right md:block">{direction === "out" ? amount : dash}</span>
            <span className="flex shrink-0 flex-col items-end md:contents">
              <span className="md:hidden">{amount}</span>
              <BalanceText value={row.runningBalance} currency={currency} className="font-semibold max-md:text-caption max-md:font-normal max-md:text-ink-muted md:text-right" />
            </span>
          </Link>
        );
      })}
      <div className="flex flex-col gap-2 border-t border-line px-5 py-3 text-small text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <span className="whitespace-nowrap">
          {ledger.meta.total} {t(ledger.meta.total === 1 ? "entry" : "entries")}
        </span>
        {ledger.entries.length > 0 && (
          <span className="tabular-nums">
            {t(adjustment !== 0 ? "Money in − money out ± transfers is the change in balance:" : "Money in − money out is the change in balance:")} {sum} = {formatSignedCurrency(change, currency)}
          </span>
        )}
        {ledger.meta.totalPages > 1 && (
          <span className="flex items-center gap-2 print:hidden">
            {t("Page")} {ledger.meta.page} {t("of")} {ledger.meta.totalPages}
            <button type="button" disabled={ledger.meta.page <= 1} onClick={() => onPage(ledger.meta.page - 1)} aria-label={t("Previous page")} className="flex size-8 items-center justify-center rounded-md border border-line bg-surface text-ink-2 disabled:opacity-50">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button type="button" disabled={ledger.meta.page >= ledger.meta.totalPages} onClick={() => onPage(ledger.meta.page + 1)} aria-label={t("Next page")} className="flex size-8 items-center justify-center rounded-md border border-line bg-surface text-ink-2 disabled:opacity-50">
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </span>
        )}
      </div>
    </Card>
  );
}
