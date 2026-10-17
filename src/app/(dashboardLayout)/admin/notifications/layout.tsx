import NotificationsHeaderAction from "@/components/modules/Admin/Notifications/NotificationsHeaderAction";
import { NOTIFICATIONS_PAGE } from "@/components/modules/Admin/Notifications/notificationsPage";
import NotificationTabs from "@/components/modules/Admin/Notifications/NotificationTabs";
import Callout from "@/components/shared/Callout";
import PageHeader from "@/components/shared/PageHeader";
import T from "@/components/shared/T";

// Shared by every notifications tab, so switching tabs keeps the header
// and tab bar in place and only the panel below loads.
const NotificationsLayout = ({ children }: LayoutProps<"/admin/notifications">) => {
  return (
    <div className="space-y-4">
      <PageHeader {...NOTIFICATIONS_PAGE} actions={<NotificationsHeaderAction />} />
      <NotificationTabs />
      <Callout variant="warning" role="status">
        <T>No email, SMS or push provider is connected yet, so templates and campaigns are saved here but nothing goes out to users.</T>
      </Callout>
      {children}
    </div>
  );
};

export default NotificationsLayout;
