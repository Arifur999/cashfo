"use client";

import Link from "next/link";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import type { AgingReport, OverdueRow } from "@/lib/customer/api";
import { agingShares, agingTotal, lateByContact } from "@/lib/customer/booksDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AgingBar, AgingLegend } from "../shared/Aging";

interface DirectionCardProps {
  direction: "RECEIVABLE" | "PAYABLE";
  aging: AgingReport;
  overdue: OverdueRow[];
  currency: string;
}

// One side of the ledger: everything customers owe you (or you owe
// suppliers), by age, with who is more than 30 days late.
export function DirectionCard({ direction, aging, overdue, currency }: DirectionCardProps) {
  const { t } = useLocale();
  const receivable = direction === "RECEIVABLE";
  const shares = agingShares(aging);
  const total = agingTotal(aging);
  const late = lateByContact(overdue);
  const over30 = late.filter((row) => row.daysLate > 30);
  const people = aging.contacts.length;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <h3 className="text-h3 text-ink">{t(receivable ? "Customers owe you" : "You owe suppliers")}</h3>
          <span className="text-small text-ink-muted">
            {t(receivable ? "Receivables" : "Payables")} · {people} {t(receivable ? (people === 1 ? "customer" : "customers") : people === 1 ? "supplier" : "suppliers")}
          </span>
        </span>
        {late.length > 0 && (
          <Chip tone="warning" size="md">
            {late.length} {t("overdue")}
          </Chip>
        )}
      </div>
      <span className={cn("text-display tabular-nums", receivable ? "text-income" : "text-expense")}>{formatCurrency(total, currency)}</span>
      {total > 0 ? (
        <>
          <AgingBar shares={shares} />
          <AgingLegend shares={shares} currency={currency} variant="tiles" />
        </>
      ) : (
        <p className="text-small text-ink-muted">{t(receivable ? "No customer owes you anything right now." : "You owe no supplier anything right now.")}</p>
      )}
      <div className="flex flex-col">
        <span className="pb-1 text-small font-semibold text-ink-2">{t("Over 30 days")}</span>
        {over30.length === 0 && <p className="border-t border-surface-sunken py-3 text-small text-ink-muted">{t("Nothing is more than 30 days late.")}</p>}
        {over30.map((row) => (
          <Link key={row.contactId} href={`/contacts/${row.contactId}`} className="-mx-2 flex items-center gap-3 rounded-md border-t border-surface-sunken px-2 py-3 transition-colors hover:bg-cream/60">
            <PersonAvatar name={row.contactName} size={36} coloured />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body font-semibold text-ink">{row.contactName}</span>
              <span className="truncate text-small text-ink-muted">
                {t("Oldest:")} {row.oldestDescription ?? t(receivable ? "a sale" : "a purchase")}, {formatDate(row.oldestDueDate, "d MMM")}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end">
              <b className="text-ink tabular-nums">{formatCurrency(row.amount, currency)}</b>
              <span className={cn("text-caption font-semibold", row.daysLate > 60 ? "text-expense" : "text-warning")}>
                {row.daysLate} {t("days late")}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
