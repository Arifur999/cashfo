import type { Metadata } from "next";
import TemplatesEditor from "@/components/modules/Admin/Notifications/Templates/TemplatesEditor";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { notificationTemplatesQuery } from "@/queries/notification.queries";
import { getUserInfo } from "@/services/auth.services";

export const metadata: Metadata = { title: "Message templates" };

const NotificationTemplatesPage = async () => {
  const admin = await getUserInfo();

  return (
    <QueryPrefetch prefetch={(client) => client.prefetchQuery(notificationTemplatesQuery())}>
      <TemplatesEditor canManage={canManage(admin?.role, "notificationTemplates")} />
    </QueryPrefetch>
  );
};

export default NotificationTemplatesPage;
