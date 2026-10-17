import FeatureRequestBoard from "@/components/modules/Admin/Support/FeatureRequests/FeatureRequestBoard";
import { SUPPORT_PAGE } from "@/components/modules/Admin/Support/supportPage";
import SupportTabs from "@/components/modules/Admin/Support/SupportTabs";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { featureRequestsQuery } from "@/queries/featureRequest.queries";
import { ticketStatsQuery } from "@/queries/ticket.queries";
import { getUserInfo } from "@/services/auth.services";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Feature requests");

const FeatureRequestsPage = async () => {
  const admin = await getUserInfo();

  return (
    <div className="space-y-4">
      <PageHeader {...SUPPORT_PAGE} />
      <QueryPrefetch prefetch={(client) => Promise.all([client.prefetchQuery(featureRequestsQuery()), client.prefetchQuery(ticketStatsQuery())])}>
        <SupportTabs />
        <FeatureRequestBoard canManage={canManage(admin?.role, "support")} />
      </QueryPrefetch>
    </div>
  );
};

export default FeatureRequestsPage;
