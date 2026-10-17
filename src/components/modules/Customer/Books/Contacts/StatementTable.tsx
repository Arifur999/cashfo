"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import type { StatementKind, StatementRow } from "@/lib/customer/booksDisplay";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BalanceText } from "../shared/BalanceText";

export type StatementSide = "customer" | "supplier" | "both";

// English, passed through t(): the three money columns for each kind of contact.
const COLUMNS: Record<StatementSide, { credit: string; balance: string; description: string }> = {
  customer: { credit: "Sold on credit", balance: "They owe", description: "Every sale and payment with this customer" },
  supplier: { credit: "Bought on credit", balance: "You owe", description: "Every purchase and payment with this supplier" },
  both: { credit: "On credit", balance: "Balance", description: "Every sale, purchase and payment with them" },
};

const KIND_LABEL: Record<StatementKind, string> = { sale: "Sale", purchase: "Purchase", received: "Payment received", paid: "Payment made" };

interface StatementTableProps {
  rows: StatementRow[];
  side: StatementSide;
  currency: string;
  // Print / PDF is offered only while the feature flag is on.
  onPrint?: () => void;
}

const GRID = "md:grid md:grid-cols-[110px_minmax(0,1fr)_130px_120px_120px] md:items-center md:gap-x-4";

// Every sale, purchase and payment with one person, oldest first, with what
// is owed after each.
export function StatementTable({ rows, side, currency, onPrint }: StatementTableProps) {
  const { t } = useLocale();
  const columns = COLUMNS[side];
  // A supplier's statement reads as what you owe, so the sign flips.
  const sign = side === "supplier" ? -1 : 1;
  const dash = <span className="text-ink-muted">—</span>;

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <span className="flex flex-col gap-0.5">
          <h3 className="text-h3 text-ink">{t("Statement")}</h3>
          <span className="text-small text-ink-muted">{t(columns.description)}</span>
        </span>
        {onPrint && rows.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onPrint} className="print:hidden">
            <Printer />
            {t("Print / PDF")}
          </Button>
        )}
      </div>
      <div className={cn("hidden border-t border-line bg-cream px-5 py-3 text-caption font-semibold text-ink-muted", GRID)}>
        <span>{t("Date")}</span>
        <span>{t("What")}</span>
        <span className="text-right">{t(columns.credit)}</span>
        <span className="text-right">{t("Paid")}</span>
        <span className="text-right">{t(columns.balance)}</span>
      </div>
      {rows.length === 0 && <p className="border-t border-surface-sunken px-5 py-10 text-center text-body text-ink-muted">{t("No sales or payments yet.")}</p>}
      {rows.map((row) => {
        const credit = row.kind === "sale" || row.kind === "purchase";
        const sub = credit ? row.note : [row.wallet, row.note].filter(Boolean).join(" · ");
        return (
          <Link key={row.id} href={`/transactions/${row.id}`} className={cn("flex min-h-14 items-center justify-between gap-3 border-t border-surface-sunken px-5 py-2 text-body transition-colors hover:bg-cream/60", GRID, row.cancelled && "opacity-60")}>
            <span className="flex min-w-0 flex-col md:contents">
              <span className="text-small text-ink-2 max-md:text-caption max-md:text-ink-muted">{formatDate(row.date, "EEE, d MMM")}</span>
              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-2">
                  <b className={cn("truncate font-semibold text-ink", row.cancelled && "line-through")}>
                    {t(KIND_LABEL[row.kind])}
                    {credit && row.reference ? ` · ${row.reference}` : ""}
                  </b>
                  {row.cancelled && (
                    <Chip tone="expense" size="sm">
                      {t("Voided")}
                    </Chip>
                  )}
                </span>
                {sub && <span className="truncate text-caption text-ink-muted">{sub}</span>}
              </span>
            </span>
            <span className="hidden text-right md:block">{credit ? <span className="font-bold text-ink tabular-nums whitespace-nowrap">{formatCurrency(row.amount, currency)}</span> : dash}</span>
            <span className="hidden text-right md:block">{credit ? dash : <span className="font-bold text-income tabular-nums whitespace-nowrap">{formatSignedCurrency(row.amount, currency)}</span>}</span>
            <span className="flex shrink-0 flex-col items-end md:contents">
              <span className={cn("font-bold tabular-nums md:hidden", credit ? "text-ink" : "text-income")}>{credit ? formatCurrency(row.amount, currency) : formatSignedCurrency(row.amount, currency)}</span>
              <BalanceText value={sign * row.running} currency={currency} className="font-bold max-md:text-caption max-md:font-normal max-md:text-ink-muted md:text-right" />
            </span>
          </Link>
        );
      })}
    </Card>
  );
}
