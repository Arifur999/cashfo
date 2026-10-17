import RateLimitsTable from "@/components/modules/Admin/System/RateLimits/RateLimitsTable";
import { RATE_LIMITS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/System/RateLimits/rateLimitsTable.config";
import RateLimitSummary from "@/components/modules/Admin/System/RateLimits/RateLimitSummary";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { buildTableQueryString } from "@/lib/queryString";
import { rateLimitLogsListQuery, rateLimitSummaryQuery } from "@/queries/system.queries";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Rate limits");

const RateLimitsPage = async ({ searchParams }: PageProps<"/admin/system/rate-limits">) => {
  const queryString = buildTableQueryString(await searchParams, RATE_LIMITS_TABLE_BASE_CONFIG);

  return (
    <QueryPrefetch
      prefetch={(client) => Promise.all([client.prefetchQuery(rateLimitSummaryQuery()), client.prefetchQuery(rateLimitLogsListQuery(queryString))])}
    >
      <RateLimitSummary />
      <RateLimitsTable />
    </QueryPrefetch>
  );
};

export default RateLimitsPage;
