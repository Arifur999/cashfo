import { unstable_rethrow } from "next/navigation";
import { AppPreferencesSection } from "@/components/modules/Customer/Settings/AppPreferencesSection";
import { getReminderPreferencesAction } from "@/lib/customer/notificationsActions";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getPushPublicKey, getReminders, getReminderTargetNames } from "@/lib/customer/reminders";
import { getAppToday } from "@/lib/date";

export const generateMetadata = () => customerPageMetadata("/settings/app");

// A side read that fails (an outage, a timeout) leaves its part of the card
// saying so, with Try again, rather than taking the page down. Next's own
// redirects (maintenance mode) still go through.
const orNull = <T,>(read: Promise<T | null>): Promise<T | null> =>
  read.catch((error: unknown) => {
    unstable_rethrow(error);
    return null;
  });

// The reminder switches are read here so they show their real state at
// once; a failed read arrives as null, and the card offers Try again.
export default async function SettingsAppPage() {
  const [reminders, habitReminders, pushPublicKey] = await Promise.all([getReminderPreferencesAction(), orNull(getReminders()), orNull(getPushPublicKey())]);
  // Names only for the reminders the list shows: the ones that are on.
  const reminderNames = habitReminders ? await getReminderTargetNames(habitReminders.reminders.filter((reminder) => reminder.enabled).map((reminder) => reminder.kind)) : {};
  return (
    <AppPreferencesSection
      today={getAppToday()}
      reminders={reminders.success && reminders.data ? reminders.data : null}
      habitReminders={habitReminders}
      reminderNames={reminderNames}
      pushPublicKey={pushPublicKey}
    />
  );
}
