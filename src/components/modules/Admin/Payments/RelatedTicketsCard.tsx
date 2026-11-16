import Link from "next/link";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import T from "@/components/shared/T";
import Card from "@/components/smartly/Card";
import { LIST_DIVIDER, LIST_HOVER } from "@/components/smartly/list/recipes";
import { formatDate } from "@/lib/date";
import { getTranslator } from "@/lib/i18n/locale";
import { shortTicketId } from "@/lib/tickets";
import { cn } from "@/lib/utils";
import type { IRelatedTicket } from "@/types/payment.types";

const ROW = cn("flex items-center gap-3 border-t px-5 py-3 text-small", LIST_DIVIDER, LIST_HOVER);

// The payer's billing tickets from around the payment, newest first, each a
// link to the conversation: what to read before a refund.
const RelatedTicketsCard = async ({ tickets }: { tickets: IRelatedTicket[] }) => {
  const { locale } = await getTranslator("admin");
  return (
    <Card asChild padding="none" className="overflow-hidden">
      <section aria-labelledby="related-tickets">
        <h2 id="related-tickets" className="px-4.5 py-3.5 text-title text-ink">
          <T>Their billing tickets</T>
        </h2>
        {tickets.map((ticket) => (
          <Link key={ticket.id} href={`/admin/support/${ticket.id}`} className={ROW}>
            <code className="font-mono font-semibold text-ink">{shortTicketId(ticket)}</code>
            <span className="flex min-w-0 grow flex-col">
              <span className="truncate text-ink">{ticket.subject}</span>
              <span className="text-caption text-ink-muted">{formatDate(ticket.createdAt, "d MMM yyyy", "—", locale)}</span>
            </span>
            <StatusBadgeCell status={ticket.status} />
          </Link>
        ))}
      </section>
    </Card>
  );
};

export default RelatedTicketsCard;
