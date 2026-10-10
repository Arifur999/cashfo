import type { Metadata } from "next";
import ManageOwnersTable from "@/components/modules/Admin/ManageOwners/ManageOwnersTable";
import { MANAGE_OWNERS_TABLE_CONFIG } from "@/components/modules/Admin/ManageOwners/manageOwnersTable.config";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { buildTableQueryString } from "@/lib/queryString";
import { ownersListQuery } from "@/queries/owner.queries";
import { getUserInfo } from "@/services/auth.services";

export const metadata: Metadata = { title: "Manage Owners" };

const ManageOwnersPage = async ({ searchParams }: PageProps<"/admin/manage-owners">) => {
  const [params, admin] = await Promise.all([searchParams, getUserInfo()]);
  const queryString = buildTableQueryString(params, MANAGE_OWNERS_TABLE_CONFIG);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Owners"
        description="View every real owner's account and, if needed, reset their workspace's business data to a clean slate."
      />
      <QueryPrefetch prefetch={(client) => client.prefetchQuery(ownersListQuery(queryString))}>
        <ManageOwnersTable canResetData={canManage(admin?.role, "ownerData")} />
      </QueryPrefetch>
    </div>
  );
};

export default ManageOwnersPage;
