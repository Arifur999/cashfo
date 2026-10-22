"use client";

import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Chip from "@/components/smartly/Chip";
import { ListCard, ListCell, ListEmpty, ListGroupRow, ListRow, ListRowLink } from "@/components/smartly/list";
import type { AgingReport, OverdueRow } from "@/lib/customer/api";
import { agingShares, agingTotal, booksDate, lateByContact } from "@/lib/customer/booksDisplay";
import { formatCurrency } from "@/lib/customer/currency";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AgingBar, AgingLegend } from "../shared/Aging";

interface DirectionCardProps {
  direction: "RECEIVABLE" | "PAYABLE";
  aging: AgingReport;
  overdue: OverdueRow[];
  currency: string;
  today: string;
}

// One side of the ledger: everything customers owe you (or you owe
// suppliers) on credit sales or purchases, by age, with who is more than
// 30 days late and by how much of it.
export function DirectionCard({ direction, aging, overdue, currency, today }: DirectionCardProps) {
  const { t, locale } = useLocale();
  const receivable = direction === "RECEIVABLE";
  const shares = agingShares(aging);
  const total = agingTotal(aging);
  const late = lateByContact(overdue);
  // Only what is past 30 days counts on this list, not a contact's whole overdue.
  const over30 = lateByContact(overdue, 30);
  const people = aging.contacts.length;
  const count = { count: formatCount(people, locale) };
  const title = t(receivable ? "Customers owe you" : "You owe suppliers");

  return (
    <ListCard
      label={t(receivable ? "Customers more than 30 days late" : "Suppliers more than 30 days late")}
      className="min-w-0"
      header={
        <div className="flex flex-col gap-4 border-b border-line px-4 py-4 md:px-6 md:py-5">
          <div className="flex items-start justify-between gap-3">
            <span className="flex flex-col gap-0.5">
              <h2 className="text-h3 text-ink">{title}</h2>
              <span className="text-small text-ink-muted">{receivable ? t(people === 1 ? "Receivables · {count} customer" : "Receivables · {count} customers", count) : t(people === 1 ? "Payables · {count} supplier" : "Payables · {count} suppliers", count)}</span>
            </span>
            {late.length > 0 && (
              <Chip tone="warning" size="md">
                {t("{count} overdue", { count: formatCount(late.length, locale) })}
              </Chip>
            )}
          </div>
          <span className="flex flex-col gap-0.5">
            <span className={cn("text-display tabular-nums wrap-anywhere", receivable ? "text-income" : "text-expense")}>{formatCurrency(total, currency, locale)}</span>
            {/* What was owed from before Books is on no invoice, so the
                aging leaves it out; the contact's own page shows it. */}
            <span className="text-caption text-ink-muted">{t(receivable ? "On credit sales" : "On credit purchases")}</span>
          </span>
          {total > 0 ? (
            <>
              <AgingBar shares={shares} />
              <AgingLegend shares={shares} currency={currency} variant="tiles" />
            </>
          ) : (
            <p className="text-small text-ink-muted">{t(receivable ? "No customer owes you anything right now." : "You owe no supplier anything right now.")}</p>
          )}
        </div>
      }
    >
      <ListGroupRow label={<h3 className="text-small font-semibold text-ink-2">{t("Over 30 days")}</h3>} />
      {over30.length === 0 && <ListEmpty title={t("Nothing is more than 30 days late.")} className="py-6" />}
      {over30.map((row) => (
        <ListRow key={row.contactId}>
          <ListCell className="flex min-w-0 items-center gap-3">
            <PersonAvatar name={row.contactName} size={36} coloured />
            <span className="flex min-w-0 flex-col">
              <ListRowLink href={`/contacts/${row.contactId}`} className="truncate text-body font-semibold text-ink">
                {row.contactName}
              </ListRowLink>
              <span className="truncate text-small text-ink-muted">{t("Oldest: {what}, {date}", { what: row.oldestDescription ?? t(receivable ? "a sale" : "a purchase"), date: booksDate(row.oldestDueDate, locale, { today }) })}</span>
            </span>
          </ListCell>
          <ListCell align="end" className="flex shrink-0 flex-col items-end">
            <b className="text-ink tabular-nums whitespace-nowrap">{formatCurrency(row.amount, currency, locale)}</b>
            <span className={cn("text-caption font-semibold whitespace-nowrap", row.daysLate > 60 ? "text-expense" : "text-warning")}>{t("{count} days late", { count: formatCount(row.daysLate, locale) })}</span>
          </ListCell>
        </ListRow>
      ))}
    </ListCard>
  );
}
