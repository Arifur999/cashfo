import { ProfileSection } from "@/components/modules/Customer/Settings/ProfileSection";
import { SettingsMobileMenu } from "@/components/modules/Customer/Settings/SettingsMobileMenu";

// /settings: the profile on a wide screen, the menu of sections on a phone.
export default function SettingsPage() {
  return (
    <>
      <div className="lg:hidden">
        <SettingsMobileMenu />
      </div>
      <div className="hidden lg:block">
        <ProfileSection />
      </div>
    </>
  );
}
