import type { Metadata } from "next";
import FeatureFlagsTable from "@/components/modules/Admin/System/FeatureFlags/FeatureFlagsTable";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { plansQuery } from "@/queries/plan.queries";
import { featureFlagsQuery } from "@/queries/system.queries";

export const metadata: Metadata = { title: "Feature Flags" };

const FeatureFlagsPage = () => {
  return (
    // Plans name the targeting chips and badges.
    <QueryPrefetch prefetch={(client) => Promise.all([client.prefetchQuery(featureFlagsQuery()), client.prefetchQuery(plansQuery())])}>
      <FeatureFlagsTable />
    </QueryPrefetch>
  );
};

export default FeatureFlagsPage;
