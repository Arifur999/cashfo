import type { Metadata } from "next";
import AnalyticsRangePicker from "@/components/modules/Admin/Analytics/AnalyticsRangePicker";
import AnalyticsView from "@/components/modules/Admin/Analytics/AnalyticsView";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { resolveAnalyticsRange, toAnalyticsRangeQuery } from "@/lib/analyticsRange";
import { getAppToday } from "@/lib/date";
import { analyticsSummaryQuery, cohortsQuery, devicesQuery, engagementQuery, featureUsageQuery, geographyQuery } from "@/queries/analytics.queries";

export const metadata: Metadata = { title: "Analytics" };

const firstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const AnalyticsPage = async ({ searchParams }: PageProps<"/admin/analytics">) => {
  const params = await searchParams;
  const today = getAppToday();
  const rangeQuery = toAnalyticsRangeQuery(
    resolveAnalyticsRange({ range: firstValue(params.range), from: firstValue(params.from), to: firstValue(params.to) }, today),
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Analytics" description="How people use Smartly, counted from what they save in the app." actions={<AnalyticsRangePicker today={today} />} />
      <QueryPrefetch
        prefetch={(client) =>
          Promise.all([
            client.prefetchQuery(analyticsSummaryQuery()),
            client.prefetchQuery(featureUsageQuery(rangeQuery)),
            client.prefetchQuery(engagementQuery(rangeQuery)),
            client.prefetchQuery(cohortsQuery()),
            client.prefetchQuery(geographyQuery()),
            client.prefetchQuery(devicesQuery()),
          ])
        }
      >
        <AnalyticsView today={today} />
      </QueryPrefetch>
    </div>
  );
};

export default AnalyticsPage;
