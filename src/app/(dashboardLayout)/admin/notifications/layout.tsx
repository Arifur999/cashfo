import NotificationsHeaderAction from "@/components/modules/Admin/Notifications/NotificationsHeaderAction";
import { NOTIFICATIONS_PAGE } from "@/components/modules/Admin/Notifications/notificationsPage";
import NotificationTabs from "@/components/modules/Admin/Notifications/NotificationTabs";
import PageHeader from "@/components/shared/PageHeader";

// Shared by every notifications tab, so switching tabs keeps the header
// and tab bar in place and only the panel below loads.
const NotificationsLayout = ({ children }: LayoutProps<"/admin/notifications">) => {
  return (
    <div className="space-y-4.5">
      <PageHeader {...NOTIFICATIONS_PAGE} actions={<NotificationsHeaderAction />} />
      <NotificationTabs />
      {children}
    </div>
  );
};

export default NotificationsLayout;
