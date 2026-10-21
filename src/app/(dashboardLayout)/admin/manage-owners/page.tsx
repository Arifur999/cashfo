import { redirect } from "next/navigation";
import ManageOwnersTable from "@/components/modules/Admin/ManageOwners/ManageOwnersTable";
import { MANAGE_OWNERS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/ManageOwners/manageOwnersTable.config";
import Callout from "@/components/shared/Callout";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import T from "@/components/shared/T";
import { canManage } from "@/lib/authUtils";
import { adminPageTitle } from "@/lib/i18n/locale";
import { userListFor } from "@/lib/navItem";
import { buildTableQueryString } from "@/lib/queryString";
import { pageHref, pastEnd } from "@/lib/table/pageParams";
import { ownersListQuery } from "@/queries/owner.queries";
import { getUserInfo } from "@/services/auth.services";
import { getOwners } from "@/services/owner.services";

// Titled as the menu names it.
export const generateMetadata = adminPageTitle("Owners");

const OWNERS_ROUTE = userListFor("owners").href;

const ManageOwnersPage = async ({ searchParams }: PageProps<"/admin/manage-owners">) => {
  const params = await searchParams;
  const queryString = buildTableQueryString(params, MANAGE_OWNERS_TABLE_BASE_CONFIG);
  // Fetched here, so a page past the end opens the last one, tab and search
  // kept, instead of first saying "No owners match". An outage is left to
  // the table, which says the list didn't load.
  const [admin, owners] = await Promise.all([getUserInfo(), getOwners(queryString).catch(() => null)]);
  const last = owners?.meta ? pastEnd(owners.meta.page, owners.meta.totalPage, owners.meta.total) : null;
  if (last !== null) redirect(pageHref(OWNERS_ROUTE, params, last));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Owners"
        description="Every owner's account. If an owner asks for a fresh start, reset their personal workspace's money data here. Their login stays as it is."
      />
      <Callout variant="warning" role="status" className="text-body">
        <T values={{ who: <b className="font-semibold"><T>Only super admins can reset data</T></b> }}>
          {"{who}, and only after the owner asks in writing. Each reset is saved in the audit log."}
        </T>
      </Callout>
      <QueryPrefetch
        prefetch={async (client) => {
          // Still one request: the rows fetched above seed the table's query.
          if (owners) client.setQueryData(ownersListQuery(queryString).queryKey, owners);
        }}
      >
        <ManageOwnersTable canResetData={canManage(admin?.role, "ownerData")} />
      </QueryPrefetch>
    </div>
  );
};

export default ManageOwnersPage;
