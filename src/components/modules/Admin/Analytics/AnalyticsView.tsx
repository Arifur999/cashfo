"use client";

import { useQuery } from "@tanstack/react-query";
import { monthLabel } from "@/components/modules/Customer/Budget/MonthSwitcher";
import { periodLabel } from "@/components/modules/Customer/Shared/PeriodPicker";
import { isMonthly, isThisMonth, rangeQueryOf } from "@/lib/adminPeriod";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { analyticsSummaryQuery, cohortsQuery, devicesQuery, engagementByMonthQuery, engagementQuery, featureUsageQuery, geographyQuery } from "@/queries/analytics.queries";
import { usePeriodWords } from "@/components/modules/Admin/Dashboard/periodWords";
import ActivePeopleCard from "./ActivePeopleCard";
import AnalyticsKpis from "./AnalyticsKpis";
import ComeBackCard from "./ComeBackCard";
import DevicesCard from "./DevicesCard";
import FeatureUsageCard from "./FeatureUsageCard";
import PlacesCard from "./PlacesCard";
import { reportQuery } from "./ReportState";
import { useAnalyticsPeriod } from "./useAnalyticsPeriod";

// The AdminAnalytics board for the period in the address: the KPI row,
// active people and devices, what people do and where they are, and the
// monthly groups up to the period. `today` comes from the server render,
// so the period resolves identically on both sides and the prefetched
// reports are used as-is.
const AnalyticsView = ({ today }: { today: string }) => {
  const period = useAnalyticsPeriod(today);
  const rangeQuery = rangeQueryOf(period, today);
  const monthly = isMonthly(period, today);
  const { t, fmt } = useLocale();
  const words = usePeriodWords(period, today);

  const summary = useQuery(analyticsSummaryQuery(rangeQuery));
  const featureUsage = useQuery(featureUsageQuery(rangeQuery));
  const daily = useQuery({ ...engagementQuery(rangeQuery), enabled: !monthly });
  const byMonth = useQuery({ ...engagementByMonthQuery(rangeQuery), enabled: monthly });
  const cohorts = useQuery(cohortsQuery(rangeQuery));
  const geography = useQuery(geographyQuery(rangeQuery));
  const devices = useQuery(devicesQuery(rangeQuery));

  // "October 2026 so far", "In 2025", or the span.
  const usageLabel =
    period.kind === "month"
      ? isThisMonth(period, today)
        ? t("{month} so far", { month: monthLabel(period.month, period.year, fmt) })
        : monthLabel(period.month, period.year, fmt)
      : period.kind === "year"
        ? t("In {year}", { year: toLocaleDigits(String(period.year), fmt) })
        : periodLabel(period, t, fmt);

  return (
    <div className="flex flex-col gap-4.5">
      <AnalyticsKpis summary={summary.data?.data} summaryQuery={reportQuery(summary)} featureUsage={featureUsage.data?.data} featureQuery={reportQuery(featureUsage)} period={period} today={today} />
      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ActivePeopleCard monthly={monthly} days={daily.data?.data} months={byMonth.data?.data} query={reportQuery(monthly ? byMonth : daily)} />
        <DevicesCard data={devices.data?.data} query={reportQuery(devices)} inPeriod={words.inPeriod} />
      </div>
      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <FeatureUsageCard data={featureUsage.data?.data} query={reportQuery(featureUsage)} rangeLabel={usageLabel} />
        <PlacesCard data={geography.data?.data} query={reportQuery(geography)} inPeriod={words.inPeriod} />
      </div>
      <ComeBackCard rows={cohorts.data?.data} query={reportQuery(cohorts)} currentMonth={today.slice(0, 7)} />
    </div>
  );
};

export default AnalyticsView;
