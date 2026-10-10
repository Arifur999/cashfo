import type { Metadata } from "next";
import SettingsForm from "@/components/modules/Admin/Settings/SettingsForm";
import PageHeader from "@/components/shared/PageHeader";
import { canManage } from "@/lib/authUtils";
import { getUserInfo } from "@/services/auth.services";
import { getPlatformSettings } from "@/services/settings.services";

export const metadata: Metadata = { title: "Settings" };

const SettingsPage = async () => {
  const [{ data: settings }, admin] = await Promise.all([getPlatformSettings(), getUserInfo()]);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Platform-wide general settings." />
      <SettingsForm initial={settings} canManage={canManage(admin?.role, "settings")} />
    </div>
  );
};

export default SettingsPage;
