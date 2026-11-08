import { unstable_rethrow } from "next/navigation";
import { NotificationsPageClient } from "@/components/modules/Customer/Settings/Notifications/NotificationsPageClient";
import { getReminderPreferencesAction } from "@/lib/customer/notificationsActions";
import { getNotificationSettings } from "@/lib/customer/notificationSettings";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getPushPublicKey, getReminders, getReminderTargetNames } from "@/lib/customer/reminders";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/settings/notifications");

// A side read that fails (an outage, a timeout) leaves its card saying so,
// with Try again, rather than taking the page down. Next's own redirects
// (maintenance mode) still go through.
const orNull = <T,>(read: Promise<T | null>): Promise<T | null> =>
  read.catch((error: unknown) => {
    unstable_rethrow(error);
    return null;
  });

// Settings › Notifications: what Smartly tells the person about, and where;
// and, under it, this device's push, the habit reminders and the monthly
// email (moved here from App preferences, as the board says).
export default async function SettingsNotificationsPage() {
  const [initial, reminders, habitReminders, pushPublicKey] = await Promise.all([getNotificationSettings(), getReminderPreferencesAction(), orNull(getReminders()), orNull(getPushPublicKey())]);
  // Names only for the reminders the list shows: the ones that are on.
  const reminderNames = habitReminders ? await getReminderTargetNames(habitReminders.reminders.filter((reminder) => reminder.enabled).map((reminder) => reminder.kind)) : {};
  return (
    <NotificationsPageClient
      initial={initial}
      today={getAppToday()}
      reminderProps={{ reminders: reminders.success && reminders.data ? reminders.data : null, habitReminders, reminderNames, pushPublicKey }}
    />
  );
}
