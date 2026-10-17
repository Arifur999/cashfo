import AdminsTable from "@/components/modules/Admin/Security/Admins/AdminsTable";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { adminAccountsQuery } from "@/queries/security.queries";
import { getUserInfo } from "@/services/auth.services";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Admin team");

const AdminAccountsPage = async () => {
  const admin = await getUserInfo();

  return (
    <QueryPrefetch prefetch={(client) => client.prefetchQuery(adminAccountsQuery())}>
      <AdminsTable currentAdminId={admin?.id ?? null} />
    </QueryPrefetch>
  );
};

export default AdminAccountsPage;
