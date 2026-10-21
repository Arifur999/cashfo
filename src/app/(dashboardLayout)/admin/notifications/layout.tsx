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
      {/* What really reaches users today, so editing here isn't mistaken
          for changing it (the backend sends with its own wording). */}
      <Callout variant="warning" role="status">
        <T>These templates and campaigns aren&apos;t used for sending yet. The welcome, password-reset and support-reply emails and the in-app bell go out with built-in wording and don&apos;t appear in Send history.</T>
      </Callout>
      {children}
    </div>
  );
};

export default NotificationsLayout;
