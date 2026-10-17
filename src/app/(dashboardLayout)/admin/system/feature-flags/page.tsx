import type { Metadata } from "next";
import FeatureFlagsBoard from "@/components/modules/Admin/System/FeatureFlags/FeatureFlagsBoard";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { plansQuery } from "@/queries/plan.queries";
import { adminAccountsQuery } from "@/queries/security.queries";
import { featureFlagsQuery } from "@/queries/system.queries";

export const metadata: Metadata = { title: "Feature flags" };

const FeatureFlagsPage = () => {
  return (
    // Plans name the targeting chips; the admin roster names who changed a flag.
    <QueryPrefetch
      prefetch={(client) => Promise.all([client.prefetchQuery(featureFlagsQuery()), client.prefetchQuery(plansQuery()), client.prefetchQuery(adminAccountsQuery())])}
    >
      <FeatureFlagsBoard />
    </QueryPrefetch>
  );
};

export default FeatureFlagsPage;
