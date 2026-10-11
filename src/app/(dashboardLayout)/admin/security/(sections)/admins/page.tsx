import type { Metadata } from "next";
import AdminsTable from "@/components/modules/Admin/Security/Admins/AdminsTable";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { adminAccountsQuery } from "@/queries/security.queries";
import { getUserInfo } from "@/services/auth.services";

export const metadata: Metadata = { title: "Admin Accounts" };

const AdminAccountsPage = async () => {
  const admin = await getUserInfo();

  return (
    <QueryPrefetch prefetch={(client) => client.prefetchQuery(adminAccountsQuery())}>
      <AdminsTable currentAdminId={admin?.id ?? null} />
    </QueryPrefetch>
  );
};

export default AdminAccountsPage;
