"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { userRecordHref } from "@/lib/navItem";
import { getInitials } from "@/lib/text";
import { earlierTicketsText } from "@/lib/tickets";
import { ticketRequesterQuery } from "@/queries/ticket.queries";
import type { ISupportTicketDetail } from "@/types/ticket.types";
import T from "@/components/shared/T";

// Who asked, as GET /admin/tickets/:id says it: their customer account
// (isCustomer) or an older ticket's own record of the person. Optional,
// as an older backend leaves it out.
type TicketWithRequester = ISupportTicketDetail & {
  requester?: { id: string; name: string; email: string; isCustomer: boolean; joinedAt?: string | null; language?: string | null } | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// The language a person reads the app in, by its code.
const LANGUAGE_NAME: Record<string, string> = { bn: "Bangla", en: "English" };

// The board's "From" card: the person, their plan, how long they have been
// with us, their history with support and the language they read, then the
// way to their page. "With us" and the language come from their record
// (a customer's only); the ways on are their own page, or a search of Users
// by email for an older record, and a search of the queue for their tickets.
const TicketRequesterCard = ({ ticket }: { ticket: TicketWithRequester }) => {
  const user = ticket.platformUser;
  const customerId = ticket.requester?.isCustomer ? ticket.requester.id : null;
  const { locale, translate } = useLocale();
  // The ticket says when they joined and their language; an older API
  // doesn't, and then their record is read for it.
  const told = ticket.requester?.joinedAt !== undefined;
  const record = useQuery({ ...ticketRequesterQuery(customerId ?? ""), enabled: customerId !== null && !told }).data?.data;
  const joinedAt = told ? ticket.requester?.joinedAt : record?.createdAt;
  const code = told ? ticket.requester?.language : record?.preferredLanguage;
  const history = ticket.requesterTickets;
  // Whole days since they signed up, from when the page opened.
  const [openedAt] = useState(() => Date.now());
  const days = joinedAt ? Math.max(0, Math.floor((openedAt - new Date(joinedAt).getTime()) / DAY_MS)) : null;
  const language = code ? (LANGUAGE_NAME[code.toLowerCase()] ?? code) : null;
  const facts: { label: string; value: React.ReactNode }[] = [
    { label: "Plan", value: user?.plan?.name ?? translate("No plan") },
    ...(days !== null ? [{ label: "With us", value: plural(translate, days, "{count} day", "{count} days", { count: formatCount(days, locale) }) }] : []),
    { label: "Earlier tickets", value: earlierTicketsText(history, translate, locale) },
    ...(language ? [{ label: "Language", value: translate(language) }] : []),
  ];
  const linkClass = "text-small font-semibold text-emerald hover:underline";

  return (
    <section aria-labelledby="ticket-from" className="flex flex-col gap-2.5 rounded-card border border-line-card bg-surface px-4.5 py-4 shadow-card">
      <h2 id="ticket-from" className="text-body font-semibold text-ink">
        <T>From@@sender</T>
      </h2>
      {user ? (
        <>
          <div className="flex items-center gap-2.5">
            <Avatar className="size-9.5">
              <AvatarFallback className="bg-mint-50 text-[12.5px] font-bold text-brand-ink">{getInitials(user.name) || "?"}</AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-col">
              <b className="truncate text-body font-bold text-ink">{user.name}</b>
              <span className="truncate text-[12.5px] leading-[normal] text-ink-muted">{user.email}</span>
            </span>
          </div>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 gap-y-1.5 text-small">
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
            {customerId ? (
              <Link href={userRecordHref(customerId)} className={linkClass}>
                <T>Open the user&apos;s page</T>
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
