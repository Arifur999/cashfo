"use client";

import { useQuery } from "@tanstack/react-query";
import HorizontalBarList from "@/components/shared/charts/HorizontalBarList";
import SectionCard from "@/components/shared/SectionCard";
import StatsGrid from "@/components/shared/StatsGrid";
import { formatNumber } from "@/lib/number";
import { humanizeEnum } from "@/lib/statusBadge";
import { rateLimitSummaryQuery } from "@/queries/system.queries";

const RateLimitSummary = () => {
  const summary = useQuery(rateLimitSummaryQuery()).data?.data;

  return (
    <div className="space-y-6">
      <StatsGrid
        columns={2}
        items={[
          { title: "Limits Hit Today", value: formatNumber(summary?.exceededToday), iconName: "ShieldAlert", description: "Windows over their request limit" },
          { title: "Busiest Endpoint", value: summary?.topEndpoints[0]?.endpoint ?? "—", iconName: "Server" },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Top Endpoints" tooltip="Endpoints with the most requests recorded across all windows.">
          <HorizontalBarList
            items={(summary?.topEndpoints ?? []).map((entry) => ({ label: entry.endpoint, value: entry.requestCount, unit: "req" }))}
            emptyMessage="No requests recorded yet."
          />
        </SectionCard>
        <SectionCard title="Top Offenders" tooltip="Callers who exceeded a limit most often.">
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
