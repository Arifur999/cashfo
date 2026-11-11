import HelpPageButton from "@/components/modules/Admin/Settings/HelpPageButton";
import SettingsBoard from "@/components/modules/Admin/Settings/SettingsBoard";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { adminHelpQuery } from "@/queries/help.queries";
import { ticketStatsQuery } from "@/queries/ticket.queries";
import { referralSettingsQuery } from "@/queries/referral.queries";
import { platformSettingsQuery } from "@/queries/settings.queries";
import { healthQuery } from "@/queries/system.queries";
import { zakatPricesQuery } from "@/queries/zakat.queries";
import { getUserInfo } from "@/services/auth.services";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Settings");

const SettingsPage = async () => {
  const admin = await getUserInfo();
  // Super admins only: they change the settings and may read the services' health.
  const manages = canManage(admin?.role, "settings");
  // Super and finance admins: the BAJUS prices members' zakat starts from.
  const managesZakat = canManage(admin?.role, "zakatPrices");

  return (
    <div className="space-y-4.5">
      <PageHeader title="Settings" description="For the whole platform. Every admin can see these; only super admins can change them." actions={<HelpPageButton look="head" />} />
      <QueryPrefetch
        prefetch={(client) =>
          Promise.all([client.prefetchQuery(platformSettingsQuery()), client.prefetchQuery(referralSettingsQuery()), client.prefetchQuery(zakatPricesQuery()), client.prefetchQuery(adminHelpQuery()), client.prefetchQuery(ticketStatsQuery()), ...(manages ? [client.prefetchQuery(healthQuery())] : [])])
        }
      >
        <SettingsBoard canManage={manages} canManageZakat={managesZakat} />
      </QueryPrefetch>
    </div>
  );
};

export default SettingsPage;
