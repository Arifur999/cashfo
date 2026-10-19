import { AppPreferencesSection } from "@/components/modules/Customer/Settings/AppPreferencesSection";
import { getReminderPreferencesAction } from "@/lib/customer/notificationsActions";
import { getAppToday } from "@/lib/date";

// The reminder switches are read here so they show their real state at once.
export default async function SettingsAppPage() {
  const reminders = await getReminderPreferencesAction();
  return <AppPreferencesSection today={getAppToday()} reminders={reminders.success && reminders.data ? reminders.data : null} />;
}
