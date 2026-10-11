import NotificationTabs from "@/components/modules/Admin/Notifications/NotificationTabs";
import Callout from "@/components/shared/Callout";
import PageHeader from "@/components/shared/PageHeader";

const NotificationsLayout = ({ children }: LayoutProps<"/admin/notifications">) => {
  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Templates, send history and bulk campaigns." />
      <Callout variant="warning">
        Delivery isn&apos;t wired up yet: no email, SMS or push provider is connected, so templates and campaigns are saved but nothing is
        sent to users.
      </Callout>
      <NotificationTabs />
      {children}
    </div>
  );
};

export default NotificationsLayout;
