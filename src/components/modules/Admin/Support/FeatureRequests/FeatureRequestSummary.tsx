"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import StatsGrid from "@/components/shared/StatsGrid";
import { formatNumber } from "@/lib/number";
import { featureRequestsQuery } from "@/queries/featureRequest.queries";
import type { FeatureRequestStatus, IFeatureRequest } from "@/types/featureRequest.types";

const countByStatus = (requests: IFeatureRequest[]) => {
  const counts = new Map<FeatureRequestStatus, number>();
  for (const request of requests) {
    counts.set(request.status, (counts.get(request.status) ?? 0) + 1);
  }
  return (...statuses: FeatureRequestStatus[]) => statuses.reduce((sum, status) => sum + (counts.get(status) ?? 0), 0);
};

// Derived from the same (cached) list the table shows, so it costs no
// extra request and follows every status change.
const FeatureRequestSummary = () => {
  const requests = useQuery(featureRequestsQuery()).data?.data;
  const count = useMemo(() => (requests ? countByStatus(requests) : null), [requests]);
  const show = (...statuses: FeatureRequestStatus[]) => formatNumber(count?.(...statuses));

  return (
    <StatsGrid
      items={[
        { title: "Awaiting Review", value: show("SUBMITTED", "UNDER_REVIEW"), iconName: "Lightbulb", description: "Submitted or under review" },
        { title: "Planned", value: show("PLANNED"), iconName: "CalendarCheck" },
        { title: "In Progress", value: show("IN_PROGRESS"), iconName: "Clock" },
        { title: "Shipped", value: show("SHIPPED"), iconName: "Rocket" },
      ]}
    />
  );
};

export default FeatureRequestSummary;
