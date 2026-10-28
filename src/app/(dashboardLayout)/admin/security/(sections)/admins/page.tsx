import AdminsTable from "@/components/modules/Admin/Security/Admins/AdminsTable";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { adminAccountsQuery, adminInvitesQuery } from "@/queries/security.queries";
import { platformSettingsQuery } from "@/queries/settings.queries";
import { getUserInfo } from "@/services/auth.services";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Admin team");

// The team, the invites still open, and the settings' two-step rule.
const AdminAccountsPage = async () => {
  const admin = await getUserInfo();

  return (
    <QueryPrefetch
      prefetch={(client) => Promise.all([client.prefetchQuery(adminAccountsQuery()), client.prefetchQuery(adminInvitesQuery()), client.prefetchQuery(platformSettingsQuery())])}
    >
      <AdminsTable currentAdminId={admin?.id ?? null} />
    </QueryPrefetch>
  );
};

export default AdminAccountsPage;
