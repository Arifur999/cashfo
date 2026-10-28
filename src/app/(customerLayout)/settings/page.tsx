import { ProfileSection } from "@/components/modules/Customer/Settings/ProfileSection";
import { SettingsMobileMenu } from "@/components/modules/Customer/Settings/SettingsMobileMenu";
import { getLoginHistoryAction, getSessionsAction } from "@/lib/customer/authActions";
import { getReminderPreferencesAction } from "@/lib/customer/notificationsActions";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { lastSignInOf } from "@/lib/customer/settingsDisplay";

export const generateMetadata = () => customerPageMetadata("/settings");

// /settings: the profile on a wide screen, the menu of sections on a phone.
// The menu's counts (devices signed in, reminders on) are read here; one
// that fails just leaves its row without a count.
export default async function SettingsPage() {
  const [history, sessions, reminders] = await Promise.all([getLoginHistoryAction(), getSessionsAction(), getReminderPreferencesAction()]);
  const remindersOn = reminders.success && reminders.data ? [reminders.data.budget, reminders.data.loans, reminders.data.savings].filter(Boolean).length : null;
  return (
    <>
      <div className="lg:hidden">
        <SettingsMobileMenu devices={sessions.success ? (sessions.data?.length ?? 0) : null} remindersOn={remindersOn} />
      </div>
      <div className="hidden lg:block">
        <ProfileSection lastSignIn={history.success ? lastSignInOf(history.data ?? []) : null} />
      </div>
    </>
  );
}
