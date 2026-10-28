import { ProfileSection } from "@/components/modules/Customer/Settings/ProfileSection";
import { getLoginHistoryAction } from "@/lib/customer/authActions";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { lastSignInOf } from "@/lib/customer/settingsDisplay";

export const generateMetadata = () => customerPageMetadata("/settings/profile");

// The profile as its own page, reached from the phone menu and the rail.
export default async function SettingsProfilePage() {
  const history = await getLoginHistoryAction();
  return <ProfileSection lastSignIn={history.success ? lastSignInOf(history.data ?? []) : null} />;
}
