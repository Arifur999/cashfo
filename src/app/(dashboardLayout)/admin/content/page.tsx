import type { Metadata } from "next";
import AccountTemplatesTable from "@/components/modules/Admin/Content/Accounts/AccountTemplatesTable";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { accountTemplatesQuery } from "@/queries/accountTemplate.queries";
import { getUserInfo } from "@/services/auth.services";

export const metadata: Metadata = { title: "Chart of Accounts" };

const ChartOfAccountsPage = async () => {
  const admin = await getUserInfo();

  return (
    <QueryPrefetch prefetch={(client) => client.prefetchQuery(accountTemplatesQuery())}>
      <AccountTemplatesTable canManage={canManage(admin?.role, "content")} />
    </QueryPrefetch>
  );
};

export default ChartOfAccountsPage;
