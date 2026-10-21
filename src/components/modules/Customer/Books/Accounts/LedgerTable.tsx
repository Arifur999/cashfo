"use client";

import Chip from "@/components/smartly/Chip";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowLink, ListSummaryRow, type SummaryKind } from "@/components/smartly/list";
import Pagination from "@/components/smartly/Pagination";
import type { Account, AccountLedger, AccountSummary } from "@/lib/customer/api";
import { booksDate, ledgerWords, type LedgerFigures } from "@/lib/customer/booksDisplay";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { ledgerDirection } from "@/lib/customer/ledger";
import { cancelledLabel } from "@/lib/customer/transactionDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BalanceText } from "../shared/BalanceText";

interface LedgerTableProps {
  // The ListCard's id: the pager brings the table back into view and focus.
  id: string;
  account: Account;
  ledger: AccountLedger;
  figures: LedgerFigures;
  summary: AccountSummary;
  currency: string;
  today: string;
  // The first and last day of the period; empty for all time.
  from?: string;
  to?: string;
  hrefFor: (page: number) => string;
  // Another period is loading.
  busy?: boolean;
}

// The rows' widths: narrower until xl, where Reference gets its own column
// (below xl it sits under the description), so the description keeps room
// at 768px and beside the 1024px sidebar.
const COLUMNS = "md:grid-cols-[96px_minmax(0,1fr)_110px_110px_120px] xl:grid-cols-[110px_minmax(0,1fr)_100px_120px_120px_130px]";

const PAGE_SIZE = 50;

// Every movement through the account in the period, oldest first, with the
// running balance. Page 1 opens on the period's opening balance and later
// pages on what the pages before brought forward; every page but the last
// carries its balance forward, and the last closes on the period's closing
// balance.
export function LedgerTable({ id, account, ledger, figures, summary, currency, today, from, to, hrefFor, busy = false }: LedgerTableProps) {
  const { t, locale } = useLocale();
  const words = ledgerWords(account);
  const adjustment = Number(summary.adjustment);
  const dash = <span className="text-ink-muted">—</span>;
  const day = (value: string) => booksDate(value, locale, { today, weekday: true });

  // The period's change as a sum: in − out, the transfers, and what a void
  // in another period left behind, each term written out.
  const terms = [`${formatCurrency(summary.totalIn, currency)} − ${formatCurrency(summary.totalOut, currency)}`];
  if (adjustment !== 0) terms.push(`${adjustment > 0 ? "+" : "−"} ${formatCurrency(Math.abs(adjustment), currency)}`);
  if (figures.voided !== 0) terms.push(`${figures.voided > 0 ? "+" : "−"} ${t("{amount} voided or reversed", { amount: formatCurrency(Math.abs(figures.voided), currency) })}`);
  const sentence = words.money
    ? adjustment !== 0
      ? "Money in − money out ± transfers is the change in balance: {sum} = {change}"
      : "Money in − money out is the change in balance: {sum} = {change}"
    : adjustment !== 0
      ? "Increases − decreases ± transfers is the change in balance: {sum} = {change}"
      : "Increases − decreases is the change in balance: {sum} = {change}";

  const summaryRow = (kind: SummaryKind, label: string, value: number, note?: string | null) => (
    <ListSummaryRow kind={kind} columns={COLUMNS}>
      <span role="cell" className="flex min-w-0 flex-col md:col-span-4 xl:col-span-5">
        <span className="font-semibold text-ink">{label}</span>
        {note && <span className="text-caption text-ink-muted">{note}</span>}
      </span>
      <span role="cell" className="text-right">
        <BalanceText value={value} currency={currency} className="font-semibold" />
      </span>
    </ListSummaryRow>
  );

  return (
    <ListCard
      id={id}
      label={t("Ledger")}
      busy={busy}
      className={cn("transition-opacity", busy && "opacity-60")}
      footer={
        ledger.meta.total > 0 && (
          <ListFooter>
            <p className="tabular-nums">{t(sentence, { sum: terms.join(" "), change: formatSignedCurrency(figures.change, currency) })}</p>
            <Pagination page={ledger.meta.page} totalPages={ledger.meta.totalPages} total={ledger.meta.total} pageSize={ledger.meta.limit || PAGE_SIZE} hrefFor={hrefFor} focusTargetId={id} className="print:hidden" />
          </ListFooter>
        )
      }
    >
      <ListHead columns={COLUMNS}>
        <ListHeadCell>{t("Date")}</ListHeadCell>
        <ListHeadCell>{t("Description")}</ListHeadCell>
        <ListHeadCell className="hidden xl:block">{t("Reference")}</ListHeadCell>
        <ListHeadCell align="end">{t(words.in)}</ListHeadCell>
        <ListHeadCell align="end">{t(words.out)}</ListHeadCell>
        <ListHeadCell align="end">{t("Balance")}</ListHeadCell>
      </ListHead>

      {figures.firstPage ? summaryRow("opening", t("Opening balance"), figures.opening, from ? day(from) : null) : summaryRow("brought-forward", t("Brought forward"), figures.pageOpening, t("From the pages before"))}

      {ledger.entries.length === 0 && <ListEmpty title={t("No entries in this period.")} />}
      {ledger.entries.map((row) => {
        const into = ledgerDirection(row.entryType, account.accountType) === "in";
        // A voided entry and the reversal that undid it both stay listed (they
        // net to nothing), set back and struck through, each with its chip.
        const cancelled = cancelledLabel({ status: row.transactionStatus, reversalOfId: row.reversalOfId ?? null });
        // Money accounts colour what came in and went out; elsewhere a debit
        // only grows the balance, so the figures stay in ink.
        const tone = cancelled ? "text-ink-muted line-through" : words.money ? (into ? "text-income" : "text-expense") : "text-ink";
        const amount = <span className={cn("font-bold tabular-nums whitespace-nowrap", tone)}>{formatSignedCurrency(into ? row.amount : -Number(row.amount), currency)}</span>;
        return (
          <ListRow key={row.entryId} columns={COLUMNS} muted={cancelled !== null}>
            <ListCell className="hidden text-small whitespace-nowrap text-ink-2 md:block">{day(row.date)}</ListCell>
            <ListCell className="flex min-w-0 flex-col">
              <span className="text-caption text-ink-muted md:hidden">{day(row.date)}</span>
              <span className="flex min-w-0 items-center gap-2">
                <ListRowLink href={`/transactions/${row.transactionId}`} className={cn("truncate font-semibold text-ink", cancelled && "line-through")}>
                  {row.description ?? t("No description")}
                </ListRowLink>
                {cancelled && (
                  <Chip tone="expense" size="sm">
                    {t(cancelled)}
                  </Chip>
                )}
              </span>
              {row.referenceNo && <span className="truncate font-mono text-caption text-ink-muted xl:hidden">{row.referenceNo}</span>}
            </ListCell>
            <ListCell className="hidden truncate font-mono text-caption text-ink-muted xl:block">{row.referenceNo ?? ""}</ListCell>
            <ListCell align="end" className="hidden md:block">
              {into ? amount : dash}
            </ListCell>
            <ListCell align="end" className="hidden md:block">
              {into ? dash : amount}
            </ListCell>
            <ListCell align="end" className="flex flex-col items-end md:block">
              <span className="md:hidden">{amount}</span>
              <BalanceText value={row.runningBalance} currency={currency} className="font-semibold max-md:text-caption max-md:font-normal max-md:text-ink-muted" />
            </ListCell>
          </ListRow>
        );
      })}

      {ledger.entries.length > 0 && (figures.lastPage ? summaryRow("closing", t("Closing balance"), figures.closing, to ? day(to) : null) : summaryRow("carried-forward", t("Carried forward"), figures.pageClosing, t("To the next page")))}
    </ListCard>
  );
}
