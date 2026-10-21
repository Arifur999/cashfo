"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw, WifiOff } from "lucide-react";
import Link from "next/link";
import Kpi from "@/components/shared/Kpi";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { hoursText } from "@/lib/tickets";
import { ticketStatsQuery } from "@/queries/ticket.queries";
import { TICKETS_ROUTE } from "../ticketLinks";

// A figure that opens the tab holding those tickets; its card darkens its
// edge on hover (LINKED), as a card that is a link does.
const KpiLink = ({ status, children }: { status: string; children: React.ReactNode }) => (
  <Link href={`${TICKETS_ROUTE}?status=${status}`} className="group block rounded-lg">
    {children}
  </Link>
);
const LINKED = "h-full transition-colors group-hover:border-line-strong";

// The design's four figures over the queue. A client query (prefetched by
// the page) rather than server props, so a ticket change anywhere
// invalidates tickets.all and the counters follow.
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

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiLink status="OPEN">
        <Kpi
          size="sm"
          className={LINKED}
          label="Need a reply"
          value={count(stats.openCount)}
          note={
            <span className={stats.unassignedOpenCount > 0 ? "text-info" : undefined}>
              {stats.unassignedOpenCount === 0
                ? translate("Everyone has someone on it")
                : translate(stats.unassignedOpenCount === 1 ? "{count} has no one assigned" : "{count} have no one assigned", { count: count(stats.unassignedOpenCount) })}
            </span>
          }
        />
      </KpiLink>
      <KpiLink status="IN_PROGRESS">
        <Kpi
          size="sm"
          className={LINKED}
          label="In progress"
          value={count(stats.inProgressCount)}
          note={
            <span className={stats.inProgressOver24hCount > 0 ? "text-warning" : undefined}>
              {stats.inProgressOver24hCount === 0 ? translate("None past the 24-hour goal") : translate("{count} past the 24-hour goal", { count: count(stats.inProgressOver24hCount) })}
            </span>
          }
        />
      </KpiLink>
      <KpiLink status="WAITING_ON_USER">
        <Kpi size="sm" className={LINKED} label="Waiting on the user" value={count(stats.waitingOnUserCount)} note="Answered, waiting to hear back" />
      </KpiLink>
      <Kpi
        size="sm"
        label="Solved this week"
        value={count(stats.solvedThisWeekCount)}
        // The average is over a month of tickets, and only good news is green.
        note={
          <span className={hasFirstReply ? "text-emerald" : "text-ink-muted"}>
            {hasFirstReply
              ? translate("First reply in {time} on average (last 30 days)", { time: toLocaleDigits(hoursText(stats.avgFirstReplyHours, translate), locale) })
              : translate("No replies in the last 30 days")}
          </span>
        }
      />
    </div>
  );
};

export default TicketStats;
