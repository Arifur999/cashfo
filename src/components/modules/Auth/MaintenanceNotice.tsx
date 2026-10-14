import { TriangleAlert } from "lucide-react";
import Banner from "@/components/smartly/Banner";
import { getPublicPlatform } from "@/lib/customer/platform";
import { getTranslator } from "@/lib/i18n/locale";

// While maintenance mode is on (Admin > Settings), the sign-in pages say so:
// customers can sign in but not use the app, and sign-up is closed. Admins
// are unaffected.
export default async function MaintenanceNotice() {
  const [platform, { t }] = await Promise.all([getPublicPlatform(), getTranslator()]);
  if (!platform.maintenance.enabled) return null;

  return (
    <Banner tone="warning" inline icon={<TriangleAlert />} className="font-normal">
      <p className="font-semibold">{t("Under maintenance")}</p>
      <p className="mt-0.5 whitespace-pre-line">{platform.maintenance.message}</p>
    </Banner>
  );
}
