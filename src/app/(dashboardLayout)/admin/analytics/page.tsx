import AnalyticsPeriodPicker from "@/components/modules/Admin/Analytics/AnalyticsPeriodPicker";
import AnalyticsView from "@/components/modules/Admin/Analytics/AnalyticsView";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { adminPeriodOf, isMonthly, rangeQueryOf } from "@/lib/adminPeriod";
import { getAppToday } from "@/lib/date";
import { adminPageTitle } from "@/lib/i18n/locale";
import { analyticsSummaryQuery, cohortsQuery, devicesQuery, engagementByMonthQuery, engagementQuery, featureUsageQuery, geographyQuery } from "@/queries/analytics.queries";

export const generateMetadata = adminPageTitle("Analytics");

// Every report is for the period in the address (this month by default),
// read here and in the view alike, so the prefetch is the one used.
const AnalyticsPage = async ({ searchParams }: PageProps<"/admin/analytics">) => {
  const today = getAppToday();
  const period = adminPeriodOf(await searchParams, today);
  const rangeQuery = rangeQueryOf(period, today);

  return (
    <div className="space-y-4.5">
      <PageHeader title="Analytics" description="How people use Smartly, counted from what they save in the app." actions={<AnalyticsPeriodPicker today={today} />} />
      <QueryPrefetch
        prefetch={(client) =>
          Promise.all([
            client.prefetchQuery(analyticsSummaryQuery(rangeQuery)),
            client.prefetchQuery(featureUsageQuery(rangeQuery)),
            isMonthly(period, today) ? client.prefetchQuery(engagementByMonthQuery(rangeQuery)) : client.prefetchQuery(engagementQuery(rangeQuery)),
            client.prefetchQuery(cohortsQuery(rangeQuery)),
            client.prefetchQuery(geographyQuery(rangeQuery)),
            client.prefetchQuery(devicesQuery(rangeQuery)),
          ])
        }
      >
        <AnalyticsView today={today} />
      </QueryPrefetch>
    </div>
  );
};

export default AnalyticsPage;
