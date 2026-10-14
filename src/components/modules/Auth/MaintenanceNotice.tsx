import { TriangleAlert } from "lucide-react";
import { getPublicPlatform } from "@/lib/customer/platform";
import { getLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";

// While maintenance mode is on (Admin > Settings), the sign-in pages say so:
// customers can sign in but not use the app, and sign-up is closed. Admins
// are unaffected.
export default async function MaintenanceNotice() {
  const [platform, locale] = await Promise.all([getPublicPlatform(), getLocale()]);
  if (!platform.maintenance.enabled) return null;
  const t = (key: string) => translate(locale, key);

  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">{t("Under maintenance")}</p>
        <p className="mt-0.5 whitespace-pre-line">{platform.maintenance.message}</p>
      </div>
    </div>
  );
}
