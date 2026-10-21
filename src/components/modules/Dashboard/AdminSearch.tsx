"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { adminSearchAction } from "@/app/-actions/adminFeedActions";
import CommandPalette, { CommandMark, useCommandShortcut, type CommandGroup } from "@/components/smartly/CommandPalette";
import Kbd from "@/components/smartly/Kbd";
import { dayLabel } from "@/components/modules/Admin/Dashboard/dashboardDates";
import { formatAmount } from "@/lib/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { shortPaymentId } from "@/lib/payments";
import { humanizeEnum } from "@/lib/statusBadge";
import { getInitials } from "@/lib/text";
import { shortTicketId } from "@/lib/tickets";
import type { IAdminSearchResult } from "@/types/adminFeed.types";

const DEBOUNCE_MS = 250;
const KBD = "shrink-0 text-caption font-medium";

// The admin top bar's search: a field that opens a palette (also on Ctrl K
// or ⌘K) finding customers, payments and tickets. ↑ ↓ move, Enter opens.
const AdminSearch = () => {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<IAdminSearchResult | null>(null);
  const latest = useRef("");

  useCommandShortcut(() => setOpen((current) => !current));

  // Asks once typing pauses; an older answer arriving late is dropped.
  useEffect(() => {
    const term = query.trim();
    latest.current = term;
    if (term.length < 2) return;
    const timer = window.setTimeout(() => {
      adminSearchAction(term).then((response) => {
        if (latest.current !== term) return;
        setResult(response.success ? response.data : { people: [], payments: [], tickets: [] });
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const searching = query.trim().length >= 2;
  const groups: CommandGroup[] =
    searching && result
      ? [
          {
            label: t("People"),
            items: result.people.map((person) => ({
              key: `u:${person.id}`,
              badge: t("User"),
              title: person.name,
              sub: [person.email, person.plan ?? (person.trialEndsAt ? t("trial ends {date}", { date: dayLabel(person.trialEndsAt, locale) }) : null)].filter(Boolean).join(" · "),
              mark: <CommandMark tone="forest">{getInitials(person.name) || "?"}</CommandMark>,
              href: `/admin/users/${person.id}`,
            })),
          },
          {
            label: t("Payments"),
            items: result.payments.map((payment) => ({
              key: `p:${payment.id}`,
              badge: t("Payment"),
              title: `${shortPaymentId(payment.id)} · ${formatAmount(payment.amount, payment.currency)}`,
              sub: [payment.name, humanizeEnum(payment.gateway), t(humanizeEnum(payment.status))].filter(Boolean).join(" · "),
              mark: <CommandMark>৳</CommandMark>,
              href: `/admin/payments/${payment.id}`,
            })),
          },
          {
            label: t("Tickets"),
            items: result.tickets.map((ticket) => ({
              key: `t:${ticket.id}`,
              badge: t("Ticket"),
              title: `${shortTicketId(ticket.id)} · ${ticket.subject}`,
              sub: [ticket.name, t(humanizeEnum(ticket.category)), t(humanizeEnum(ticket.status)).toLowerCase()].filter(Boolean).join(" · "),
              mark: <CommandMark>#</CommandMark>,
              href: `/admin/support/${ticket.id}`,
            })),
          },
        ]
      : [];

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setResult(null);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("Search people, payments, tickets")}
        className="flex size-11 shrink-0 items-center justify-center rounded-md text-ink-2 md:hidden"
      >
        <Search className="size-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-10 w-60 shrink-0 items-center xl:w-92 gap-3 rounded-md border border-line bg-strip pr-2 pl-4 text-body text-ink-muted hover:border-line-strong md:flex"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">{t("Search people, payments, tickets…")}</span>
        <Kbd className={KBD}>Ctrl K</Kbd>
      </button>

      <CommandPalette
        open={open}
        onOpenChange={changeOpen}
        query={query}
        onQueryChange={setQuery}
        groups={groups}
        // Still waiting for the first answer: "Nothing found" would be a guess.
        loading={searching && !result}
        label={t("Search people, payments, tickets")}
        placeholder={t("Search people, payments, tickets…")}
        title={t("Search")}
        description={t("Searches names, emails, phone numbers, payment and ticket IDs")}
        idle={t("Type a name, email, phone, payment or ticket ID.")}
        empty={t("Nothing found for “{query}”.", { query: query.trim() })}
        footer={
          <>
            <span>{t("↑ ↓ to move")}</span>
            <span>{t("Enter to open")}</span>
            <span>{t("Searches names, emails, phone numbers, payment and ticket IDs")}</span>
          </>
        }
      />
    </>
  );
};

export default AdminSearch;
