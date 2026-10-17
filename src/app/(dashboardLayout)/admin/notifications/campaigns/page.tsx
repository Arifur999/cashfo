import CampaignsTable from "@/components/modules/Admin/Notifications/Campaigns/CampaignsTable";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { campaignsQuery, notificationLogStatsQuery, notificationTemplatesQuery } from "@/queries/notification.queries";
import { plansQuery } from "@/queries/plan.queries";
import { getUserInfo } from "@/services/auth.services";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Campaigns");

const CampaignsPage = async () => {
  const admin = await getUserInfo();

  return (
    // Templates and plans feed the campaign drawer and the audience column.
    <QueryPrefetch
      prefetch={(client) =>
        Promise.all([
          client.prefetchQuery(campaignsQuery()),
          client.prefetchQuery(notificationLogStatsQuery()),
          client.prefetchQuery(notificationTemplatesQuery()),
          client.prefetchQuery(plansQuery()),
        ])
      }
    >
      <CampaignsTable canManage={canManage(admin?.role, "notificationCampaigns")} />
    </QueryPrefetch>
  );
};

export default CampaignsPage;
