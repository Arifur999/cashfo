import type { Metadata } from "next";
import AnalyticsView from "@/components/modules/Admin/Analytics/AnalyticsView";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { resolveAnalyticsRange, toAnalyticsRangeQuery } from "@/lib/analyticsRange";
import { getAppToday } from "@/lib/date";
import { cohortsQuery, devicesQuery, engagementQuery, featureUsageQuery, geographyQuery } from "@/queries/analytics.queries";

export const metadata: Metadata = { title: "Analytics" };

const firstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const AnalyticsPage = async ({ searchParams }: PageProps<"/admin/analytics">) => {
  const params = await searchParams;
  const today = getAppToday();
  const rangeQuery = toAnalyticsRangeQuery(
    resolveAnalyticsRange({ range: firstValue(params.range), from: firstValue(params.from), to: firstValue(params.to) }, today),
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Feature usage, engagement, retention and reach." />
      <QueryPrefetch
        prefetch={(client) =>
          Promise.all([
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
