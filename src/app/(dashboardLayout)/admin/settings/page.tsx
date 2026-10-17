import type { Metadata } from "next";
import SettingsBoard from "@/components/modules/Admin/Settings/SettingsBoard";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { platformSettingsQuery } from "@/queries/settings.queries";
import { getUserInfo } from "@/services/auth.services";

export const metadata: Metadata = { title: "Settings" };

const SettingsPage = async () => {
  const admin = await getUserInfo();

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="For the whole platform. Every admin can see these; only super admins can change them." />
      <QueryPrefetch prefetch={(client) => client.prefetchQuery(platformSettingsQuery())}>
        <SettingsBoard canManage={canManage(admin?.role, "settings")} />
      </QueryPrefetch>
    </div>
  );
};

export default SettingsPage;
