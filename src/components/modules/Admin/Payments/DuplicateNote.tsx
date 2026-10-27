import Link from "next/link";
import Button from "@/components/smartly/Button";
import { formatDate } from "@/lib/date";
import { shortPaymentId } from "@/lib/payments";
import { shortTicketId } from "@/lib/tickets";
import type { IPaymentDetail } from "@/types/payment.types";
import { getTranslator } from "@/lib/i18n/locale";
import { countPhrase, paymentHref } from "./paymentsDisplay";

const minutesApart = (a: string, b: string) => Math.max(1, Math.round(Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60_000));

// The amber note over a payment that repeats an earlier one: who, which
// plan, how close together, and a way to the earlier payment (keeping the
// list it was opened from).
const DuplicateNote = async ({ payment, back }: { payment: IPaymentDetail; back?: string }) => {
  const { t, locale } = await getTranslator("admin");
  const earlier = payment.otherPayments.find((other) => other.id === payment.duplicateOfId);
  const gap = earlier ? minutesApart(payment.createdAt, earlier.createdAt) : null;
  // The payer's billing ticket from around then ("Charged twice?"), newest.
  const ticket = payment.relatedTickets?.[0];
  const firstName = (payment.platformUser?.name ?? "").split(/\s+/)[0] || t("They");

  return (
    <div role="note" className="flex flex-col gap-3 rounded-lg border border-warning/25 bg-warning-soft p-4 text-body leading-relaxed text-warning sm:flex-row sm:items-center">
      <div className="flex grow flex-col gap-1">
        <b className="font-semibold">
          {gap === null ? t("Same person, same plan") : countPhrase(t, locale, gap, "Same person, same plan, {count} minute apart", "Same person, same plan, {count} minutes apart")}
        </b>
        <span>
          {t(earlier ? "{id} already paid for {plan} on {date}. Check with the person before refunding this one." : "{id} already paid for {plan}. Check with the person before refunding this one.", {
            id: payment.duplicateOfId ? shortPaymentId(payment.duplicateOfId) : "",
            plan: payment.plan.name,
            date: earlier ? formatDate(earlier.createdAt, "d MMM", "—", locale) : "",
          })}
          {ticket && <> {t("{name} also wrote to support: ticket {ticket} “{subject}”.", { name: firstName, ticket: shortTicketId(ticket.id), subject: ticket.subject })}</>}
        </span>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {payment.duplicateOfId && (
          <Button asChild variant="secondary" size="sm" className="shrink-0">
            <Link href={paymentHref(payment.duplicateOfId, back)}>{t("Open {name}", { name: shortPaymentId(payment.duplicateOfId) })}</Link>
          </Button>
        )}
        {ticket && (
          <Button asChild variant="secondary" size="sm" className="shrink-0">
            <Link href={`/admin/support/${ticket.id}`}>{t("Ticket {id}", { id: shortTicketId(ticket.id) })}</Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default DuplicateNote;
