"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { userRecordHref } from "@/lib/navItem";
import { getInitials } from "@/lib/text";
import { earlierTicketsText } from "@/lib/tickets";
import type { ISupportTicketDetail } from "@/types/ticket.types";
import T from "@/components/shared/T";
import { requesterTicketsHref } from "../ticketLinks";

// Who asked, as GET /admin/tickets/:id says it: their customer account
// (isCustomer) or an older ticket's own record of the person. Optional,
// as an older backend leaves it out.
type TicketWithRequester = ISupportTicketDetail & {
  requester?: { id: string; name: string; email: string; isCustomer: boolean } | null;
};

// Who wrote: the person, their plan, their history with support, and the
// ways on: a search of the queue for their tickets (while they have earlier
// ones), and the way to them in Users: their own page when the ticket says
// they are a customer, else a search of Users by email.
//
// The count is the person's OTHER tickets, exactly. The queue search can't
// leave this ticket out and matches emails by substring, so it is labelled
// as the search it is, not as a list of the tickets counted.
const TicketRequesterCard = ({ ticket }: { ticket: TicketWithRequester }) => {
  const user = ticket.platformUser;
  const customerId = ticket.requester?.isCustomer ? ticket.requester.id : null;
  const { locale, translate } = useLocale();
  const history = ticket.requesterTickets;
  const facts: { label: string; value: React.ReactNode }[] = [
    { label: "Plan", value: user?.plan?.name ?? translate("No plan") },
    { label: "Earlier tickets", value: earlierTicketsText(history, translate, locale) },
  ];
  const linkClass = "text-small font-semibold text-emerald hover:underline";

  return (
    <section aria-labelledby="ticket-from" className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-5 py-4 shadow-card">
      <h2 id="ticket-from" className="text-body font-semibold text-ink">
        <T>From@@sender</T>
      </h2>
      {user ? (
        <>
          <div className="flex items-center gap-3">
            <Avatar className="size-9.5">
              <AvatarFallback className="bg-mint-50 text-small font-bold text-emerald">{getInitials(user.name) || "?"}</AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-col">
              <b className="truncate text-body font-semibold text-ink">{user.name}</b>
              <span className="truncate text-small text-ink-muted">{user.email}</span>
            </span>
          </div>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-small">
            {facts.map((fact) => (
              <div key={fact.label} className="contents">
                <dt className="text-ink-muted">
                  <T>{fact.label}</T>
                </dt>
                <dd className="text-right font-semibold text-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {history.total > 0 && (
              <Link href={requesterTicketsHref(user.email, history)} className={linkClass}>
                <T>Find their tickets</T>
              </Link>
            )}
            {customerId ? (
              <Link href={userRecordHref(customerId)} className={linkClass}>
                <T>Open their page</T>
              </Link>
            ) : (
              <Link href={`/admin/users?search=${encodeURIComponent(user.email)}`} className={linkClass}>
                <T>Find in Users</T>
              </Link>
            )}
          </div>
        </>
      ) : (
        <p className="text-small text-ink-muted"><T>This person&apos;s record is gone.</T></p>
      )}
    </section>
  );
};

export default TicketRequesterCard;
