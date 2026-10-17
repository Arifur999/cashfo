import type { Metadata } from "next";
import ManageOwnersTable from "@/components/modules/Admin/ManageOwners/ManageOwnersTable";
import { MANAGE_OWNERS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/ManageOwners/manageOwnersTable.config";
import Callout from "@/components/shared/Callout";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { buildTableQueryString } from "@/lib/queryString";
import { ownersListQuery } from "@/queries/owner.queries";
import { getUserInfo } from "@/services/auth.services";
import T from "@/components/shared/T";

export const metadata: Metadata = { title: "Manage owners" };

const ManageOwnersPage = async ({ searchParams }: PageProps<"/admin/manage-owners">) => {
  const [params, admin] = await Promise.all([searchParams, getUserInfo()]);
  const queryString = buildTableQueryString(params, MANAGE_OWNERS_TABLE_BASE_CONFIG);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Manage owners"
        description="Every owner's account. If an owner asks for a fresh start, reset their workspace's money data here. Their login stays as it is."
      />
      <Callout variant="warning" role="status" className="text-body">
        <T values={{ who: <b className="font-semibold"><T>Only super admins can reset data</T></b> }}>
          {"{who}, and only after the owner asks in writing. Each reset is saved in the audit log."}
        </T>
      </Callout>
      <QueryPrefetch prefetch={(client) => client.prefetchQuery(ownersListQuery(queryString))}>
        <ManageOwnersTable canResetData={canManage(admin?.role, "ownerData")} />
      </QueryPrefetch>
    </div>
  );
};

export default ManageOwnersPage;
