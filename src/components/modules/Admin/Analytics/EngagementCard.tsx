"use client";

import TrendChart from "@/components/shared/charts/TrendChart";
import SectionCard from "@/components/shared/SectionCard";
import { formatNumber } from "@/lib/number";
import type { IEngagementPoint } from "@/types/analytics.types";
import { formatShortDay } from "./analyticsLabels";

// A client component because the axis formatters are functions.
const EngagementCard = ({ data }: { data: IEngagementPoint[] }) => {
  // A flat line at zero says less than "no sessions" does.
  const hasActivity = data.some((point) => point.dau > 0 || point.wau > 0);

  return (
    <SectionCard
      title="Engagement"
      tooltip="Daily and weekly active users: distinct users with at least one session that day / in the trailing 7 days."
    >
      <TrendChart
        data={hasActivity ? data.map((point) => ({ date: point.date, dau: point.dau, wau: point.wau })) : []}
        xKey="date"
        series={[
          { key: "wau", label: "Weekly active", color: "var(--chart-4)" },
          { key: "dau", label: "Daily active", color: "var(--chart-1)" },
        ]}
        ariaLabel="Daily and weekly active users over the selected range"
        formatX={formatShortDay}
        formatY={(value) => formatNumber(value)}
        integerValues
        emptyMessage="No sessions in this range."
      />
    </SectionCard>
  );
};

export default EngagementCard;
