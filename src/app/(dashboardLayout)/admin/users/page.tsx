import { redirect } from "next/navigation";
import UsersTable from "@/components/modules/Admin/UserManagement/UsersTable";
import { USERS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/UserManagement/usersTable.config";
import { ExportButton, ExportProvider } from "@/components/shared/ExportAction";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { adminPageTitle } from "@/lib/i18n/locale";
import { ADMIN_USERS_ROUTE } from "@/lib/navItem";
import { buildTableQueryString } from "@/lib/queryString";
import { pageHref, pastEnd } from "@/lib/table/pageParams";
import { ownersListQuery } from "@/queries/owner.queries";
import { plansQuery } from "@/queries/plan.queries";
import { getUserInfo } from "@/services/auth.services";
import { getOwners } from "@/services/owner.services";

export const generateMetadata = adminPageTitle("Users");

const UsersPage = async ({ searchParams }: PageProps<"/admin/users">) => {
  const params = await searchParams;
  const queryString = buildTableQueryString(params, USERS_TABLE_BASE_CONFIG);
  // The page is fetched here rather than only prefetched, so a page past
  // the end (an old link, people gone since) opens the last one, filters
  // kept, instead of first saying "No users match". An outage is left to
  // the table, which says the list didn't load.
  const [admin, owners] = await Promise.all([getUserInfo(), getOwners(queryString).catch(() => null)]);
  const last = owners?.meta ? pastEnd(owners.meta.page, owners.meta.totalPage, owners.meta.total) : null;
  if (last !== null) redirect(pageHref(ADMIN_USERS_ROUTE, params, last));

  return (
    <ExportProvider>
      <div className="space-y-4.5">
        <PageHeader
          title="Users"
          description="Everyone with a Smartly account. Open a person to change their plan, reset their password or suspend them."
          actions={<ExportButton label="Export CSV" />}
        />
        <QueryPrefetch
          prefetch={(client) => {
            // Still one request: the rows fetched above seed the table's query.
            if (owners) client.setQueryData(ownersListQuery(queryString).queryKey, owners);
            return client.prefetchQuery(plansQuery());
          }}
        >
          <UsersTable canChangeStatus={canManage(admin?.role, "ownerStatus")} canChangePlan={canManage(admin?.role, "ownerPlan")} />
        </QueryPrefetch>
      </div>
    </ExportProvider>
  );
};

export default UsersPage;
