import { AppPreferencesSection } from "@/components/modules/Customer/Settings/AppPreferencesSection";
import { getAppToday } from "@/lib/date";

export default function SettingsAppPage() {
  return <AppPreferencesSection today={getAppToday()} />;
}
