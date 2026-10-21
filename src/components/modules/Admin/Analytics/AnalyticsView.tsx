"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { AnalyticsRange } from "@/lib/analyticsRange";
import { rangeName } from "@/lib/analyticsWording";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { analyticsSummaryQuery, cohortsQuery, devicesQuery, engagementQuery, featureUsageQuery, geographyQuery } from "@/queries/analytics.queries";
import ActivePeopleCard from "./ActivePeopleCard";
import AnalyticsKpis from "./AnalyticsKpis";
import ComeBackCard from "./ComeBackCard";
import DevicesCard from "./DevicesCard";
import FeatureUsageCard from "./FeatureUsageCard";
import PlacesCard from "./PlacesCard";
import { reportQuery } from "./ReportState";
import { useAnalyticsRange } from "./useAnalyticsRange";

const sameRange = (a: AnalyticsRange, b: AnalyticsRange) => a.preset === b.preset && a.from === b.from && a.to === b.to;

// `today` comes from the server render, so the range resolves identically
// on both sides and the prefetched reports are used as-is. The period
// switch sits in the page header and shares the range through the URL.
const AnalyticsView = ({ today }: { today: string }) => {
  const { range, rangeQuery } = useAnalyticsRange(today);
  const { translate, locale } = useLocale();
  // Range-bound reports keep the previous range's data on screen while the
  // next one loads; the rest don't depend on the range at all.
  const featureUsage = useQuery({ ...featureUsageQuery(rangeQuery), placeholderData: keepPreviousData });
  const engagement = useQuery({ ...engagementQuery(rangeQuery), placeholderData: keepPreviousData });
  const summary = useQuery(analyticsSummaryQuery());
  const cohorts = useQuery(cohortsQuery());
  const geography = useQuery(geographyQuery());
  const devices = useQuery(devicesQuery());

  // The range the feature figures on screen belong to. While the next
  // range loads they are still the last one's, so its name stays with them
  // until the new figures arrive (React's "adjust state while rendering").
  const [shownRange, setShownRange] = useState(range);
  const settled = !featureUsage.isPlaceholderData;
  if (settled && !sameRange(shownRange, range)) setShownRange(range);
  const figuresRange = settled ? range : shownRange;
  const featureQuery = reportQuery(featureUsage);

  return (
    <div className="space-y-4">
      <AnalyticsKpis summary={summary.data?.data} summaryQuery={reportQuery(summary)} featureUsage={featureUsage.data?.data} featureQuery={featureQuery} range={figuresRange} />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ActivePeopleCard data={engagement.data?.data} query={reportQuery(engagement)} />
        <DevicesCard data={devices.data?.data} query={reportQuery(devices)} />
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <FeatureUsageCard data={featureUsage.data?.data} query={featureQuery} rangeLabel={rangeName(figuresRange, translate, locale)} />
        <PlacesCard data={geography.data?.data} query={reportQuery(geography)} />
      </div>
      <ComeBackCard rows={cohorts.data?.data} query={reportQuery(cohorts)} currentMonth={today.slice(0, 7)} />
    </div>
  );
};

export default AnalyticsView;
