"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { ticketStatsQuery } from "@/queries/ticket.queries";
import { TICKETS_ROUTE } from "../ticketLinks";

const SHOW_NEW_HREF = `${TICKETS_ROUTE}?${new URLSearchParams({ unseen: "true" }).toString()}`;

// The board's blue note over the queue: messages customers sent from
// Settings › Help that nobody has opened yet, and "Show them" -- the queue
// cut to those. While it is cut, the note says so and leads back to every
// ticket.
const NewTicketsNote = () => {
  const { translate, locale } = useLocale();
  const showingNew = useSearchParams().get("unseen") === "true";
  const count = useQuery(ticketStatsQuery()).data?.data.newFromHelpPageCount ?? 0;
  if (!showingNew && count === 0) return null;

  const message = showingNew
    ? translate("Showing only the tickets nobody has opened yet.")
    : plural(translate, count, "{count} new message came in from the Help page.", "{count} new messages came in from the Help page.", undefined, locale);

  return (
    <div role="status" className="flex items-center gap-2.5 rounded-[14px] border border-info-line bg-info-50 px-4 py-2.75 text-[13.5px] leading-[normal] text-info-ink">
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-info" />
      <span className="min-w-0 grow">{message}</span>
      <Link
        href={showingNew ? TICKETS_ROUTE : SHOW_NEW_HREF}
        className="flex h-7.5 shrink-0 items-center rounded-full border border-info-line bg-surface px-3 text-[12.5px] font-semibold whitespace-nowrap text-info transition-colors hover:bg-info-50 pointer-coarse:h-11"
      >
        {translate(showingNew ? "Show all tickets" : "Show them")}
      </Link>
    </div>
  );
};

export default NewTicketsNote;
