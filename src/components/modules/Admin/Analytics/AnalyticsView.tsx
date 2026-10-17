"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { rangeName } from "@/lib/analyticsWording";
import { analyticsSummaryQuery, cohortsQuery, devicesQuery, engagementQuery, featureUsageQuery, geographyQuery } from "@/queries/analytics.queries";
import ActivePeopleCard from "./ActivePeopleCard";
import AnalyticsKpis from "./AnalyticsKpis";
import ComeBackCard from "./ComeBackCard";
import DevicesCard from "./DevicesCard";
import FeatureUsageCard from "./FeatureUsageCard";
import PlacesCard from "./PlacesCard";
import { useAnalyticsRange } from "./useAnalyticsRange";

// `today` comes from the server render, so the range resolves identically
// on both sides and the prefetched reports are used as-is. The period
// switch sits in the page header and shares the range through the URL.
const AnalyticsView = ({ today }: { today: string }) => {
  const { range, rangeQuery } = useAnalyticsRange(today);
  // Range-bound reports keep the previous range's data on screen while the
  // next one loads; the rest don't depend on the range at all.
  const featureUsage = useQuery({ ...featureUsageQuery(rangeQuery), placeholderData: keepPreviousData });
  const engagement = useQuery({ ...engagementQuery(rangeQuery), placeholderData: keepPreviousData });
  const summary = useQuery(analyticsSummaryQuery());
  const cohorts = useQuery(cohortsQuery());
  const geography = useQuery(geographyQuery());
  const devices = useQuery(devicesQuery());

  return (
    <div className="space-y-4">
      <AnalyticsKpis summary={summary.data?.data} featureUsage={featureUsage.data?.data} range={range} />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ActivePeopleCard data={engagement.data?.data ?? []} />
        <DevicesCard data={devices.data?.data ?? []} />
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <FeatureUsageCard data={featureUsage.data?.data ?? []} rangeLabel={rangeName(range)} />
        <PlacesCard data={geography.data?.data ?? { countries: [], cities: [] }} />
      </div>
      <ComeBackCard rows={cohorts.data?.data ?? []} currentMonth={today.slice(0, 7)} />
    </div>
  );
};

export default AnalyticsView;
