import Link from "next/link";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import T from "@/components/shared/T";
import { formatAmount } from "@/lib/currency";
import { formatDate, formatElapsed } from "@/lib/date";
import { getTranslator } from "@/lib/i18n/locale";
import { shortPaymentId } from "@/lib/payments";
import { humanizeEnum } from "@/lib/statusBadge";
import { shortTicketId, TICKET_STATUS_LABEL } from "@/lib/tickets";
import type { IOwnerTicket } from "@/types/owner.types";
import type { IPayment } from "@/types/payment.types";
import type { TicketStatus } from "@/types/ticket.types";

// The person page's Billing and Support tabs: their payments and their
// tickets, each row opening its own page.

const CARD = "overflow-clip rounded-card border border-line-card bg-surface shadow-card";
const ROW = "flex items-center gap-3 border-t border-divider px-4.5 py-3 text-[13.5px] leading-[normal] transition-colors hover:bg-hover";

interface OwnerPaymentsCardProps {
  // null when the list couldn't be loaded.
  payments: IPayment[] | null;
  total: number;
  // Payments, searched for this person.
  allHref: string;
}

export async function OwnerPaymentsCard({ payments, total, allHref }: OwnerPaymentsCardProps) {
  const { t, locale } = await getTranslator("admin");
  return (
    <section aria-labelledby="owner-payments" className={CARD}>
      <div className="flex items-baseline justify-between gap-3 px-4.5 py-3.5">
        <h2 id="owner-payments" className="text-title text-ink">
          <T>Payments</T>
        </h2>
        {total > 0 && (
          <Link href={allHref} className="text-small font-semibold text-emerald hover:underline">
            <T>Open in Payments</T>
          </Link>
        )}
      </div>
      {payments === null ? (
        <p className="border-t border-divider px-4.5 py-4 text-small text-ink-muted">
          <T>Couldn&apos;t load this. Refresh to try again.</T>
        </p>
      ) : payments.length === 0 ? (
        <p className="border-t border-divider px-4.5 py-4 text-small text-ink-muted">
          <T>No payments yet.</T>
        </p>
      ) : (
        <ul>
          {payments.map((payment) => (
            <li key={payment.id}>
              <Link href={`/admin/payments/${payment.id}`} className={ROW}>
                <span className="w-24 shrink-0 font-mono text-[12.5px] font-semibold text-ink-2">{shortPaymentId(payment.id)}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-semibold text-ink">{payment.plan.name}</span>
                  <span className="truncate text-caption text-ink-muted">
                    {[formatDate(payment.paidAt ?? payment.createdAt, "d MMM yyyy", "—", locale), humanizeEnum(payment.gateway), payment.couponCode].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-ink tabular-nums">{formatAmount(payment.amount, payment.currency, locale)}</span>
                <StatusBadgeCell status={payment.status} dot className="shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {payments !== null && total > payments.length && (
        <p className="border-t border-divider px-4.5 py-3 text-caption text-ink-muted">{t("The newest {shown} of {total}.", { shown: payments.length, total })}</p>
      )}
    </section>
  );
}

// Their latest tickets (the API sends the five newest), any status.
export async function OwnerTicketsCard({ tickets, allHref }: { tickets: IOwnerTicket[]; allHref: string }) {
  const { t, locale } = await getTranslator("admin");
  return (
    <section aria-labelledby="owner-tickets" className={CARD}>
      <div className="flex items-baseline justify-between gap-3 px-4.5 py-3.5">
        <h2 id="owner-tickets" className="text-title text-ink">
          <T>Tickets</T>
        </h2>
        <Link href={allHref} className="text-small font-semibold text-emerald hover:underline">
          <T>Open the inbox</T>
        </Link>
      </div>
      {tickets.length === 0 ? (
        <p className="border-t border-divider px-4.5 py-4 text-small text-ink-muted">
          <T>No tickets yet.</T>
        </p>
      ) : (
        <ul>
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link href={`/admin/support/${ticket.id}`} className={ROW}>
                <span className="w-16 shrink-0 font-mono text-[12.5px] font-semibold text-ink-2">{shortTicketId(ticket)}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-semibold text-ink">{ticket.subject}</span>
                  <span className="truncate text-caption text-ink-muted">
                    {t(TICKET_STATUS_LABEL[ticket.status as TicketStatus] ?? "Open")} · {t(humanizeEnum(ticket.category))}
                  </span>
                </span>
                <StatusBadgeCell status={ticket.priority} className="shrink-0" />
                <span className="w-16 shrink-0 text-right text-[12.5px] text-ink-muted">{formatElapsed(ticket.updatedAt, { t, locale })}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
