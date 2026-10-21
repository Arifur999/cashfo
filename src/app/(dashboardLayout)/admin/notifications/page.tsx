import TemplatesEditor from "@/components/modules/Admin/Notifications/Templates/TemplatesEditor";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { notificationTemplatesQuery } from "@/queries/notification.queries";
import { getUserInfo } from "@/services/auth.services";
import { adminPageTitle } from "@/lib/i18n/locale";

// Named like its tab.
export const generateMetadata = adminPageTitle("Templates");

const NotificationTemplatesPage = async () => {
  const admin = await getUserInfo();

  return (
    <QueryPrefetch prefetch={(client) => client.prefetchQuery(notificationTemplatesQuery())}>
      <TemplatesEditor canManage={canManage(admin?.role, "notificationTemplates")} />
    </QueryPrefetch>
  );
};

export default NotificationTemplatesPage;
