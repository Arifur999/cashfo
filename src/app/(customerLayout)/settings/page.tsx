import { ProfileSection } from "@/components/modules/Customer/Settings/ProfileSection";
import { SettingsMobileMenu } from "@/components/modules/Customer/Settings/SettingsMobileMenu";
import PageFrame from "@/components/smartly/PageFrame";
import { getLoginHistoryAction, getSessionsAction } from "@/lib/customer/authActions";
import { getReminderPreferencesAction } from "@/lib/customer/notificationsActions";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getProfileReferral } from "@/lib/customer/referrals";
import { lastSignInOf } from "@/lib/customer/settingsDisplay";
import { getAppToday } from "@/lib/date";
import { getTranslator } from "@/lib/i18n/locale";

export const generateMetadata = () => customerPageMetadata("/settings");

// /settings: the profile on a wide screen, the menu of sections on a phone
// (the top bar names it, so its heading is for screen readers only). The
// menu's counts (devices signed in, reminders on) are read here; one that
// fails just leaves its row without a count.
export default async function SettingsPage() {
  const [history, sessions, reminders, referral, t] = await Promise.all([getLoginHistoryAction(), getSessionsAction(), getReminderPreferencesAction(), getProfileReferral(), getTranslator()]).then(([a, b, c, d, e]) => [a, b, c, d, e.t] as const);
  const remindersOn = reminders.success && reminders.data ? [reminders.data.budget, reminders.data.loans, reminders.data.savings].filter(Boolean).length : null;
  return (
    <>
      <PageFrame className="gap-5.5 max-md:pt-4 md:pt-7 md:pb-8 lg:hidden">
        <h1 className="sr-only">{t("Settings")}</h1>
        <SettingsMobileMenu devices={sessions.success ? (sessions.data?.length ?? 0) : null} remindersOn={remindersOn} />
      </PageFrame>
      <div className="hidden lg:block">
        <ProfileSection lastSignIn={history.success ? lastSignInOf(history.data ?? []) : null} referral={referral} today={getAppToday()} />
      </div>
    </>
  );
}
