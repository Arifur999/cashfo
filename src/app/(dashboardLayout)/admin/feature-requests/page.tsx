import type { Metadata } from "next";
import FeatureRequestsTable from "@/components/modules/Admin/Support/FeatureRequests/FeatureRequestsTable";
import FeatureRequestSummary from "@/components/modules/Admin/Support/FeatureRequests/FeatureRequestSummary";
import SupportTabs from "@/components/modules/Admin/Support/SupportTabs";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { featureRequestsQuery } from "@/queries/featureRequest.queries";
import { getUserInfo } from "@/services/auth.services";

export const metadata: Metadata = { title: "Feature Requests" };

const FeatureRequestsPage = async () => {
  const admin = await getUserInfo();

  return (
    <div className="space-y-6">
      <PageHeader title="Support" description="Support tickets and feature requests." />
      <QueryPrefetch prefetch={(client) => client.prefetchQuery(featureRequestsQuery())}>
        <FeatureRequestSummary />
        <SupportTabs />
        <FeatureRequestsTable canManage={canManage(admin?.role, "support")} />
      </QueryPrefetch>
    </div>
  );
};

export default FeatureRequestsPage;
