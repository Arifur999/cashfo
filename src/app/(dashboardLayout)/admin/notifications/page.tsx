import type { Metadata } from "next";
import TemplatesTable from "@/components/modules/Admin/Notifications/Templates/TemplatesTable";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { notificationTemplatesQuery } from "@/queries/notification.queries";
import { getUserInfo } from "@/services/auth.services";

export const metadata: Metadata = { title: "Notification Templates" };

const NotificationTemplatesPage = async () => {
  const admin = await getUserInfo();

  return (
    <QueryPrefetch prefetch={(client) => client.prefetchQuery(notificationTemplatesQuery())}>
      <TemplatesTable canManage={canManage(admin?.role, "notificationTemplates")} />
    </QueryPrefetch>
  );
};

export default NotificationTemplatesPage;
