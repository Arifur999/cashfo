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

// Who wrote: the person, their plan, their history with support (a link to
// those tickets), and the way to them in Users: their own page when the
// ticket says they are a customer, else a search of Users by email.
const TicketRequesterCard = ({ ticket }: { ticket: TicketWithRequester }) => {
  const user = ticket.platformUser;
  const customerId = ticket.requester?.isCustomer ? ticket.requester.id : null;
  const { locale, translate } = useLocale();
  const history = ticket.requesterTickets;
  const earlier = earlierTicketsText(history, translate, locale);
  const facts: { label: string; value: React.ReactNode }[] = [
    { label: "Plan", value: user?.plan?.name ?? translate("No plan") },
    {
      label: "Earlier tickets",
      value:
        user && history.total > 0 ? (
          <Link href={requesterTicketsHref(user.email, history)} className="text-emerald hover:underline">
            {earlier}
          </Link>
        ) : (
          earlier
        ),
    },
  ];

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
          {customerId ? (
            <Link href={userRecordHref(customerId)} className="self-start text-small font-semibold text-emerald hover:underline">
              <T>Open their page</T>
            </Link>
          ) : (
            <Link href={`/admin/users?search=${encodeURIComponent(user.email)}`} className="self-start text-small font-semibold text-emerald hover:underline">
              <T>Find in Users</T>
            </Link>
          )}
        </>
      ) : (
        <p className="text-small text-ink-muted"><T>This person&apos;s record is gone.</T></p>
      )}
    </section>
  );
};

export default TicketRequesterCard;
