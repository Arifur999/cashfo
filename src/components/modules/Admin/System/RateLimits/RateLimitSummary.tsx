"use client";

import { useQuery } from "@tanstack/react-query";
import HorizontalBarList from "@/components/shared/charts/HorizontalBarList";
import Kpi from "@/components/shared/Kpi";
import SectionCard from "@/components/shared/SectionCard";
import { formatNumber } from "@/lib/number";
import { humanizeEnum } from "@/lib/statusBadge";
import { rateLimitSummaryQuery } from "@/queries/system.queries";

// Two figures over the endpoints that take the most requests and the
// callers who hit a limit most often.
const RateLimitSummary = () => {
  const summary = useQuery(rateLimitSummaryQuery()).data?.data;
  const [busiest] = summary?.topEndpoints ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Kpi size="sm" label="Limits hit today" value={formatNumber(summary?.exceededToday)} note="Request windows over their limit" />
        <Kpi
          size="sm"
          label="Busiest endpoint"
          value={<code className="block truncate font-mono text-title">{busiest?.endpoint ?? "—"}</code>}
          note={busiest ? `${formatNumber(busiest.requestCount)} requests so far` : "No requests recorded yet"}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Top endpoints" tooltip="Endpoints with the most requests recorded across all windows.">
          <HorizontalBarList
            items={(summary?.topEndpoints ?? []).map((entry) => ({ label: entry.endpoint, value: entry.requestCount, unit: "req" }))}
            emptyMessage="No requests recorded yet."
          />
        </SectionCard>
        <SectionCard title="Top offenders" tooltip="Callers who exceeded a limit most often.">
          <HorizontalBarList
            items={(summary?.topOffenders ?? []).map((entry) => ({
              label: `${entry.identifier} (${humanizeEnum(entry.identifierType.toUpperCase())})`,
              value: entry.count,
              unit: "hits",
            }))}
            emptyMessage="Nobody has hit a limit."
          />
        </SectionCard>
      </div>
    </div>
  );
};

export default RateLimitSummary;
