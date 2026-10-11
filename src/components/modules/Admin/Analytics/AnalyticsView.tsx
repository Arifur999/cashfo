"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import SectionCard from "@/components/shared/SectionCard";
import { cohortsQuery, devicesQuery, engagementQuery, featureUsageQuery, geographyQuery } from "@/queries/analytics.queries";
import AnalyticsRangePicker from "./AnalyticsRangePicker";
import AnalyticsSummary from "./AnalyticsSummary";
import CohortRetentionGrid from "./CohortRetentionGrid";
import DeviceBreakdownCard from "./DeviceBreakdownCard";
import EngagementCard from "./EngagementCard";
import FeatureUsageCard from "./FeatureUsageCard";
import GeographyCard from "./GeographyCard";
import { useAnalyticsRange } from "./useAnalyticsRange";

// `today` comes from the server render, so the range resolves identically
// on both sides and the prefetched reports are used as-is.
const AnalyticsView = ({ today }: { today: string }) => {
  const { range, rangeQuery, setRange } = useAnalyticsRange(today);

  // Range-bound reports keep the previous range's data on screen while the
  // next one loads; the all-time ones don't depend on the range at all.
  const featureUsage = useQuery({ ...featureUsageQuery(rangeQuery), placeholderData: keepPreviousData });
  const engagement = useQuery({ ...engagementQuery(rangeQuery), placeholderData: keepPreviousData });
  const cohorts = useQuery(cohortsQuery());
  const geography = useQuery(geographyQuery());
  const devices = useQuery(devicesQuery());

  return (
    <div className="space-y-6">
      <AnalyticsRangePicker range={range} today={today} onChange={setRange} isUpdating={featureUsage.isPlaceholderData || engagement.isPlaceholderData} />
      <AnalyticsSummary featureUsage={featureUsage.data?.data} engagement={engagement.data?.data} />

      <div className="grid gap-6 lg:grid-cols-2">
        <FeatureUsageCard data={featureUsage.data?.data ?? []} />
        <EngagementCard data={engagement.data?.data ?? []} />
      </div>

      <SectionCard title="Cohort Retention" tooltip="Of the users who signed up in a month, the share still active in each month after.">
        <CohortRetentionGrid rows={cohorts.data?.data ?? []} />
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <GeographyCard data={geography.data?.data ?? { countries: [], cities: [] }} />
        <DeviceBreakdownCard data={devices.data?.data ?? []} />
      </div>
    </div>
  );
};

export default AnalyticsView;
