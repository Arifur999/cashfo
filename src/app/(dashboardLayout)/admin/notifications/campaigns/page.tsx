import type { Metadata } from "next";
import CampaignsTable from "@/components/modules/Admin/Notifications/Campaigns/CampaignsTable";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { campaignsQuery, notificationTemplatesQuery } from "@/queries/notification.queries";
import { plansQuery } from "@/queries/plan.queries";
import { getUserInfo } from "@/services/auth.services";

export const metadata: Metadata = { title: "Campaigns" };

const CampaignsPage = async () => {
  const admin = await getUserInfo();

  return (
    // Templates and plans feed the campaign form and the audience column.
    <QueryPrefetch
      prefetch={(client) =>
        Promise.all([
          client.prefetchQuery(campaignsQuery()),
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
