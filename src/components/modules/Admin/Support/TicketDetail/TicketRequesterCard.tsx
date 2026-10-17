"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getInitials } from "@/lib/text";
import { earlierTicketsText } from "@/lib/tickets";
import type { ISupportTicketDetail } from "@/types/ticket.types";
import T from "@/components/shared/T";

// Who wrote: the person, their plan, their history with support, and a
// way to their page (found by email, since older tickets keep their own
// record of the person).
const TicketRequesterCard = ({ ticket }: { ticket: ISupportTicketDetail }) => {
  const user = ticket.platformUser;
  const { translate } = useLocale();
  const facts = [
    { label: "Plan", value: user?.plan?.name ?? translate("No plan") },
    { label: "Earlier tickets", value: earlierTicketsText(ticket.requesterTickets, translate) },
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
          <Link href={`/admin/users?search=${encodeURIComponent(user.email)}`} className="text-small font-semibold text-emerald hover:underline">
            <T>Open the user&apos;s page</T>
          </Link>
        </>
      ) : (
        <p className="text-small text-ink-muted"><T>This person&apos;s record is gone.</T></p>
      )}
    </section>
  );
};

export default TicketRequesterCard;
