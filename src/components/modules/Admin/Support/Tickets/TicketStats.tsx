"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw, WifiOff } from "lucide-react";
import Kpi from "@/components/shared/Kpi";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { hoursText } from "@/lib/tickets";
import { ticketStatsQuery } from "@/queries/ticket.queries";
import type { ITicketStats } from "@/types/ticket.types";
import { AWAITING_REPLY_HREF, ticketStatusHref } from "../ticketLinks";

// "Need a reply": the tickets whose last message is the customer's,
// opening that tab. A backend without the figure counts the open tickets.
const needsReplyFigure = (stats: ITicketStats) =>
  stats.needsReplyCount !== undefined ? { value: stats.needsReplyCount, href: AWAITING_REPLY_HREF } : { value: stats.openCount, href: ticketStatusHref("OPEN") };

// The board's figure card: 14px by 18px around a 23px value.
const FIGURE = "px-4.5 py-3.5";

// The design's four figures over the queue, each but the last opening the
// tickets it counts. A client query (prefetched by the page) rather than
// server props, so a ticket change anywhere invalidates tickets.all and
// the counters follow.
const TicketStats = () => {
  const query = useQuery(ticketStatsQuery());
  const stats = query.data?.data;
  const { locale, translate } = useLocale();

  // The figures failing to load is said, not left as an empty gap.
  if (!stats) {
    return query.isError ? (
      <Banner tone="warning" inline icon={<WifiOff />}>
        <span className="flex flex-wrap items-center gap-3">
          <span className="grow">{translate("Couldn't load the queue figures.")}</span>
          <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
            <RefreshCw aria-hidden="true" />
            {translate("Try again")}
          </Button>
        </span>
      </Banner>
    ) : null;
  }

  const count = (value: number) => formatCount(value, locale);
  const hasFirstReply = stats.avgFirstReplyHours > 0;
  const needsReply = needsReplyFigure(stats);
  // Past the day's goal (24 hours), in amber, or none.
  const lateNote = (late: number) => (
    <span className="text-warning">{late === 0 ? translate("None past the 24-hour goal") : translate("{count} past the 24-hour goal", { count: count(late) })}</span>
  );

  return (
    // Two by two on a phone, so the queue isn't four full-width cards down.
    <div className="grid grid-cols-2 gap-3 sm:gap-3.5 xl:grid-cols-4">
      <Kpi
        size="sm"
        href={needsReply.href}
        label="Need a reply"
        value={count(needsReply.value)}
        className={FIGURE}
        note={
          <span className="text-info">
            {stats.unassignedOpenCount === 0
              ? translate("Everyone has someone on it")
              : translate(stats.unassignedOpenCount === 1 ? "{count} has no one assigned" : "{count} have no one assigned", { count: count(stats.unassignedOpenCount) })}
          </span>
        }
      />
      <Kpi size="sm" className={FIGURE} href={ticketStatusHref("IN_PROGRESS")} label="In progress" value={count(stats.inProgressCount)} note={lateNote(stats.inProgressOver24hCount)} />
      <Kpi size="sm" className={FIGURE} href={ticketStatusHref("WAITING_ON_USER")} label="Waiting on the user" value={count(stats.waitingOnUserCount)} note="Closed after 7 quiet days" />
      <Kpi
        size="sm"
        className={FIGURE}
        label="Solved this week"
        value={count(stats.solvedThisWeekCount)}
        // The average is over a month of tickets, and only good news is green.
        note={
          <span className={hasFirstReply ? "text-emerald" : "text-ink-muted"}>
            {hasFirstReply
              ? translate("First reply in {time} on average", { time: hoursText(stats.avgFirstReplyHours, translate, locale) })
              : translate("No replies in the last 30 days")}
          </span>
        }
      />
    </div>
  );
};

export default TicketStats;
