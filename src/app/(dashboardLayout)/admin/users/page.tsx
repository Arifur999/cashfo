import UsersTable from "@/components/modules/Admin/UserManagement/UsersTable";
import { USERS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/UserManagement/usersTable.config";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { buildTableQueryString } from "@/lib/queryString";
import { ownersListQuery } from "@/queries/owner.queries";
import { plansQuery } from "@/queries/plan.queries";
import { getUserInfo } from "@/services/auth.services";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Users");

const UsersPage = async ({ searchParams }: PageProps<"/admin/users">) => {
  const queryString = buildTableQueryString(await searchParams, USERS_TABLE_BASE_CONFIG);
  const admin = await getUserInfo();

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Everyone with a Smartly account. Open a person to change their plan, reset their password or suspend them." />
      <QueryPrefetch
        prefetch={(client) =>
          Promise.all([client.prefetchQuery(ownersListQuery(queryString)), client.prefetchQuery(plansQuery())])
        }
      >
        <UsersTable canChangeStatus={canManage(admin?.role, "ownerStatus")} canChangePlan={canManage(admin?.role, "ownerPlan")} />
      </QueryPrefetch>
    </div>
  );
};

export default UsersPage;
