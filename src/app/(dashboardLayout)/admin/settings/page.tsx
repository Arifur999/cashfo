import { getCurrentAdmin } from "@/lib/adminAuth";
import { getPlatformSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { t } from "@/lib/i18n/t";

export default async function SettingsPage() {
  const [settings, admin] = await Promise.all([getPlatformSettings(), getCurrentAdmin()]);
  const canManage = admin?.role === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("Settings")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("Platform-wide general settings.")}</p>
      </div>

      <SettingsForm initial={settings} canManage={canManage} />
    </div>
  );
}
