import { AppPreferencesSection } from "@/components/modules/Customer/Settings/AppPreferencesSection";
import { getReminderPreferencesAction } from "@/lib/customer/notificationsActions";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/settings/app");

// The reminder switches are read here so they show their real state at
// once; a failed read arrives as null, and the card offers Try again.
export default async function SettingsAppPage() {
  const reminders = await getReminderPreferencesAction();
  return <AppPreferencesSection today={getAppToday()} reminders={reminders.success && reminders.data ? reminders.data : null} />;
}
