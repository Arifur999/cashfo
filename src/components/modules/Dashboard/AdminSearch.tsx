"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { adminSearchAction } from "@/app/-actions/adminFeedActions";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatAmount } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { shortPaymentId } from "@/lib/payments";
import { humanizeEnum } from "@/lib/statusBadge";
import { getInitials } from "@/lib/text";
import { shortTicketId } from "@/lib/tickets";
import { cn } from "@/lib/utils";
import type { IAdminSearchResult } from "@/types/adminFeed.types";

interface Hit {
  key: string;
  group: "People" | "Payments" | "Tickets";
  badge: string;
  title: string;
  sub: string;
  // The round tile: initials for a person, ৳ or # otherwise.
  mark: string;
  person: boolean;
  href: string;
}

const KBD = "shrink-0 rounded-sm border border-line bg-surface px-2 py-0.5 font-mono text-caption font-medium text-ink-muted";
const DEBOUNCE_MS = 250;

// The admin top bar's search: a field that opens a palette (also on Ctrl K
// or ⌘K) finding customers, payments and tickets. ↑ ↓ move, Enter opens.
const AdminSearch = () => {
  const router = useRouter();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<IAdminSearchResult | null>(null);
  const [active, setActive] = useState(0);
  const latest = useRef("");

  const toggle = useEffectEvent((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      setOpen((current) => !current);
    }
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => toggle(event);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Asks once typing pauses; an older answer arriving late is dropped.
  useEffect(() => {
    const term = query.trim();
    latest.current = term;
    if (term.length < 2) return;
    const timer = window.setTimeout(() => {
      adminSearchAction(term).then((response) => {
        if (latest.current !== term) return;
        setResult(response.success ? response.data : { people: [], payments: [], tickets: [] });
        setActive(0);
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const searching = query.trim().length >= 2;
  const hits: Hit[] = searching && result
    ? [
        ...result.people.map((person) => ({
          key: `u:${person.id}`,
          group: "People" as const,
          badge: "User",
          title: person.name,
          sub: [person.email, person.plan ?? (person.trialEndsAt ? t("trial ends {date}", { date: formatDate(person.trialEndsAt, "d MMM") }) : null)].filter(Boolean).join(" · "),
          mark: getInitials(person.name) || "?",
          person: true,
          href: `/admin/users/${person.id}`,
        })),
        ...result.payments.map((payment) => ({
          key: `p:${payment.id}`,
          group: "Payments" as const,
          badge: "Payment",
          title: `${shortPaymentId(payment.id)} · ${formatAmount(payment.amount, payment.currency)}`,
          sub: [payment.name, humanizeEnum(payment.gateway), t(humanizeEnum(payment.status))].filter(Boolean).join(" · "),
          mark: "৳",
          person: false,
          href: `/admin/payments/${payment.id}`,
        })),
        ...result.tickets.map((ticket) => ({
          key: `t:${ticket.id}`,
          group: "Tickets" as const,
          badge: "Ticket",
          title: `${shortTicketId(ticket.id)} · ${ticket.subject}`,
          sub: [ticket.name, t(humanizeEnum(ticket.category)), t(humanizeEnum(ticket.status)).toLowerCase()].filter(Boolean).join(" · "),
          mark: "#",
          person: false,
          href: `/admin/support/${ticket.id}`,
        })),
      ]
    : [];

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setResult(null);
    }
  }

  function go(hit: Hit | undefined) {
    if (!hit) return;
    changeOpen(false);
    router.push(hit.href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (hits.length === 0) return;
      setActive((index) => (index + (event.key === "ArrowDown" ? 1 : hits.length - 1)) % hits.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(hits[active]);
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
        className="hidden h-10 w-92 shrink-0 items-center gap-3 rounded-md border border-line bg-cream pr-2 pl-4 text-body text-ink-muted hover:border-line-strong md:flex"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">{t("Search people, payments, tickets…")}</span>
        <kbd className={KBD}>Ctrl K</kbd>
      </button>

      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent showCloseButton={false} className="top-24 w-160 max-w-[calc(100%-2rem)] translate-y-0 gap-0 overflow-hidden rounded-lg bg-surface p-0 text-ink shadow-overlay ring-0 sm:max-w-160">
          <DialogTitle className="sr-only">{t("Search")}</DialogTitle>
          <DialogDescription className="sr-only">{t("Searches names, emails, phone numbers, payment and ticket IDs")}</DialogDescription>
          <div className="flex h-15 items-center gap-3 border-b border-line px-4">
            <Search className="size-4.5 shrink-0 text-ink-muted" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded={hits.length > 0}
              aria-controls="admin-search-results"
              aria-activedescendant={hits[active] ? `admin-search-${hits[active].key}` : undefined}
              aria-label={t("Search people, payments, tickets")}
              placeholder={t("Search people, payments, tickets…")}
              className="min-w-0 flex-1 bg-transparent text-[18px] text-ink outline-none placeholder:text-ink-faint"
            />
            <kbd className={KBD}>Esc</kbd>
          </div>

          <div id="admin-search-results" role="listbox" className="max-h-[min(28rem,calc(100vh-14rem))] overflow-y-auto pt-1 pb-2">
            {!searching && <p className="px-4 py-6 text-center text-small text-ink-muted">{t("Type a name, email, phone, payment or ticket ID.")}</p>}
            {searching && result && hits.length === 0 && <p className="px-4 py-6 text-center text-small text-ink-muted">{t("Nothing found for “{query}”.", { query: query.trim() })}</p>}
            {hits.map((hit, index) => (
              <div key={hit.key}>
                {hit.group !== hits[index - 1]?.group && <span className="block px-4 pt-3 pb-1 text-caption font-bold tracking-[0.08em] text-ink-muted uppercase">{t(hit.group)}</span>}
                <button
                  id={`admin-search-${hit.key}`}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => go(hit)}
                  className={cn("flex w-full items-center gap-3 px-4 py-3 text-left", index === active && "bg-mint-50")}
                >
                  <span aria-hidden="true" className={cn("flex size-8.5 shrink-0 items-center justify-center rounded-full text-caption font-bold", hit.person ? "bg-forest text-mint-200" : "bg-surface-sunken text-ink-2")}>
                    {hit.mark}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <b className="truncate text-body font-semibold text-ink">{hit.title}</b>
                    <span className="truncate text-caption text-ink-muted">{hit.sub}</span>
                  </span>
                  <span className="flex h-6 shrink-0 items-center rounded-full bg-cream px-3 text-caption font-semibold text-ink-2">{t(hit.badge)}</span>
                </button>
              </div>
            ))}
          </div>

          <div className="hidden gap-4 border-t border-line bg-cream px-4 py-3 text-caption text-ink-muted sm:flex">
            <span>{t("↑ ↓ to move")}</span>
            <span>{t("Enter to open")}</span>
            <span>{t("Searches names, emails, phone numbers, payment and ticket IDs")}</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminSearch;
