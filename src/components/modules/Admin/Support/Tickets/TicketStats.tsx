"use client";

import { useQuery } from "@tanstack/react-query";
import Kpi from "@/components/shared/Kpi";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/number";
import { hoursText } from "@/lib/tickets";
import { ticketStatsQuery } from "@/queries/ticket.queries";

// The design's four figures over the queue. A client query (prefetched by
// the page) rather than server props, so a ticket change anywhere
// invalidates tickets.all and the counters follow.
const TicketStats = () => {
  const stats = useQuery(ticketStatsQuery()).data?.data;
  const { translate } = useLocale();
  if (!stats) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi
        size="sm"
        label="Need a reply"
        value={formatNumber(stats.openCount)}
        note={
          <span className={stats.unassignedOpenCount > 0 ? "text-info" : undefined}>
            {stats.unassignedOpenCount === 0
              ? translate("Everyone has someone on it")
              : translate(stats.unassignedOpenCount === 1 ? "{count} has no one assigned" : "{count} have no one assigned", { count: formatNumber(stats.unassignedOpenCount) })}
          </span>
        }
      />
      <Kpi
        size="sm"
        label="In progress"
        value={formatNumber(stats.inProgressCount)}
        note={
          <span className={stats.inProgressOver24hCount > 0 ? "text-warning" : undefined}>
            {stats.inProgressOver24hCount === 0 ? translate("None past the 24-hour goal") : translate("{count} past the 24-hour goal", { count: formatNumber(stats.inProgressOver24hCount) })}
          </span>
        }
      />
      <Kpi size="sm" label="Waiting on the user" value={formatNumber(stats.waitingOnUserCount)} note="Answered, waiting to hear back" />
      <Kpi
        size="sm"
        label="Solved this week"
        value={formatNumber(stats.solvedThisWeekCount)}
        note={<span className="text-emerald">{stats.avgFirstReplyHours > 0 ? translate("First reply in {time} on average", { time: hoursText(stats.avgFirstReplyHours, translate) }) : translate("No replies in the last 30 days")}</span>}
      />
    </div>
  );
};

export default TicketStats;
