import { ProfileSection } from "@/components/modules/Customer/Settings/ProfileSection";
import { customerPageMetadata } from "@/lib/customer/pageTitle";

export const generateMetadata = () => customerPageMetadata("/settings/profile");

// The profile as its own page, reached from the phone menu.
export default function SettingsProfilePage() {
  return <ProfileSection />;
}
