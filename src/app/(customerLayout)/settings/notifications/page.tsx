import { NotificationsPageClient } from "@/components/modules/Customer/Settings/Notifications/NotificationsPageClient";
import { getNotificationSettings } from "@/lib/customer/notificationSettings";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/settings/notifications");

// Settings › Notifications: what Smartly tells the person about, and where.
export default async function SettingsNotificationsPage() {
  return <NotificationsPageClient initial={await getNotificationSettings()} today={getAppToday()} />;
}
