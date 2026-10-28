"use client";

import Chip from "@/components/smartly/Chip";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowLink, ListSummaryRow, type SummaryKind } from "@/components/smartly/list";
import Pagination from "@/components/smartly/Pagination";
import { booksDate, type StatementKind, type StatementRow } from "@/lib/customer/booksDisplay";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BalanceText } from "../shared/BalanceText";

export type StatementSide = "customer" | "supplier" | "both";

// English, passed through t(): the three money columns for each kind of contact.
export const STATEMENT_COLUMNS: Record<StatementSide, { credit: string; balance: string; description: string }> = {
  customer: { credit: "Sold on credit", balance: "They owe", description: "Every sale and payment with this customer" },
  supplier: { credit: "Bought on credit", balance: "You owe", description: "Every purchase and payment with this supplier" },
  both: { credit: "On credit", balance: "Balance", description: "Every sale, purchase and payment with them" },
};

export const STATEMENT_KIND_LABEL: Record<StatementKind, string> = { sale: "Sale", purchase: "Purchase", received: "Payment received", paid: "Payment made" };

export interface StatementPaging {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  // What they owed before the statement's first row (the opening balance),
  // and before and after this page's rows.
  broughtForward: number;
  pageOpening: number;
  pageClosing: number;
}

interface StatementTableProps {
  // The ListCard's id: the pager brings the table back into view and focus.
  id: string;
  rows: StatementRow[];
  side: StatementSide;
  currency: string;
  today: string;
  // The statement endpoint's pages; null for an older backend, whose rows
  // are the newest 50 postings.
  paging: StatementPaging | null;
  hrefFor: (page: number) => string;
  // Older backend only: what was owed from before Books, which its rows
  // start from, and whether there were more postings than the ones read.
  opening?: number;
  truncated?: boolean;
}

// The columns follow the card's own width, not the window's, so beside the
// side cards or on a phone the rows keep their two-line layout until the
// card has room for five columns.
const COLUMNS = "@[44rem]:grid-cols-[96px_minmax(0,1fr)_120px_112px_120px]";

// Every sale, purchase and payment with one person, oldest first, with what
// is owed after each. Page 1 opens on what was owed from before Books,
// later pages on what the pages before brought forward.
export function StatementTable({ id, rows, side, currency, today, paging, hrefFor, opening = 0, truncated = false }: StatementTableProps) {
  const { t, fmt } = useLocale();
  const columns = STATEMENT_COLUMNS[side];
  // A supplier's statement reads as what you owe, so the sign flips.
  const sign = side === "supplier" ? -1 : 1;
  const dash = <span className="text-ink-muted">—</span>;
  const firstPage = !paging || paging.page <= 1;
  const lastPage = !paging || paging.page >= paging.totalPages;

  const summaryRow = (kind: SummaryKind, label: string, value: number, note?: string) => (
    <ListSummaryRow kind={kind} columns={COLUMNS}>
      <span role="cell" className="flex min-w-0 flex-col @[44rem]:col-span-4">
        <span className="font-semibold text-ink">{label}</span>
        {note && <span className="text-caption text-ink-muted">{note}</span>}
      </span>
      <span role="cell" className="text-right">
        <BalanceText value={sign * value} currency={currency} className="font-semibold" />
      </span>
    </ListSummaryRow>
  );

  // Payments are coloured by which way the money went: in from them in
  // green with a plus, out to them in red with a minus. A cancelled row's
  // figure no longer counts, so it is set back and struck through.
  const amountClass = (row: StatementRow, tone: string) => cn("font-bold tabular-nums whitespace-nowrap", row.cancelled ? "text-ink-muted line-through" : tone);
  const paidAmount = (row: StatementRow) => (row.kind === "received" ? <span className={amountClass(row, "text-income")}>{formatSignedCurrency(row.amount, currency, fmt)}</span> : <span className={amountClass(row, "text-expense")}>{formatSignedCurrency(-row.amount, currency, fmt)}</span>);
  const creditAmount = (row: StatementRow) => <span className={amountClass(row, "text-ink")}>{formatCurrency(row.amount, currency, fmt)}</span>;

  const footer =
    paging && paging.total > 0 ? (
      <ListFooter className="print:hidden">
        <Pagination page={paging.page} totalPages={paging.totalPages} total={paging.total} pageSize={paging.pageSize} hrefFor={hrefFor} focusTargetId={id} />
      </ListFooter>
    ) : truncated ? (
      <ListFooter>
        <p>{t("Showing the newest {count} postings.", { count: formatCount(rows.length, fmt) })}</p>
      </ListFooter>
    ) : null;

  return (
    <ListCard id={id} label={t("Statement")} title={t("Statement")} description={t(columns.description)} className="@container" footer={footer}>
      <ListHead columns={COLUMNS} showOnPhone className="hidden @[44rem]:grid">
        <ListHeadCell>{t("Date")}</ListHeadCell>
        <ListHeadCell>{t("What")}</ListHeadCell>
        <ListHeadCell align="end">{t(columns.credit)}</ListHeadCell>
        <ListHeadCell align="end">{t("Paid@@statement")}</ListHeadCell>
        <ListHeadCell align="end">{t(columns.balance)}</ListHeadCell>
      </ListHead>

      {paging
        ? firstPage
          ? paging.broughtForward !== 0 && summaryRow("opening", t("Opening balance"), paging.broughtForward, t("From before Books"))
          : summaryRow("brought-forward", t("Brought forward"), paging.pageOpening, t("From the pages before"))
        : opening !== 0 && summaryRow("opening", t("Opening balance"), opening, t("From before Books"))}

      {rows.length === 0 && <ListEmpty title={t("No sales or payments yet.")} />}
      {rows.map((row) => {
        const credit = row.kind === "sale" || row.kind === "purchase";
        const sub = credit ? row.note : [row.wallet, row.note].filter(Boolean).join(" · ");
        const date = booksDate(row.date, fmt, { today, weekday: true });
        return (
          <ListRow key={row.id} columns={COLUMNS} muted={row.cancelled}>
            <ListCell className="hidden text-small text-ink-2 @[44rem]:block">{date}</ListCell>
            <ListCell className="flex min-w-0 flex-col">
              <span className="text-caption text-ink-muted @[44rem]:hidden">{date}</span>
              <span className="flex min-w-0 items-center gap-2">
                <ListRowLink href={`/transactions/${row.id}`} className={cn("truncate font-semibold text-ink", row.cancelled && "line-through")}>
                  {t(STATEMENT_KIND_LABEL[row.kind])}
                  {credit && row.reference ? ` · ${row.reference}` : ""}
                </ListRowLink>
                {row.cancelled && (
                  <Chip tone="expense" size="sm">
                    {t("Voided")}
                  </Chip>
                )}
              </span>
              {sub && <span className="truncate text-caption text-ink-muted">{sub}</span>}
            </ListCell>
            <ListCell align="end" className="hidden @[44rem]:block">
              {credit ? creditAmount(row) : dash}
            </ListCell>
            <ListCell align="end" className="hidden @[44rem]:block">
              {credit ? dash : paidAmount(row)}
            </ListCell>
            <ListCell align="end" className="flex shrink-0 flex-col items-end @[44rem]:block">
              <span className="@[44rem]:hidden">{credit ? creditAmount(row) : paidAmount(row)}</span>
              <BalanceText value={sign * row.running} currency={currency} className="font-bold @max-[44rem]:text-caption @max-[44rem]:font-normal @max-[44rem]:text-ink-muted" />
            </ListCell>
          </ListRow>
        );
      })}

      {paging && rows.length > 0 && !lastPage && summaryRow("carried-forward", t("Carried forward"), paging.pageClosing, t("To the next page"))}
    </ListCard>
  );
}
