import type { Metadata } from "next";
import FailingNetworks from "@/components/modules/Admin/Security/Logins/FailingNetworks";
import LoginAttemptsTable from "@/components/modules/Admin/Security/Logins/LoginAttemptsTable";
import { LOGIN_ATTEMPTS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/Security/Logins/loginAttemptsTable.config";
import LoginKpis from "@/components/modules/Admin/Security/Logins/LoginKpis";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { buildTableQueryString } from "@/lib/queryString";
import { loginAttemptsListQuery, loginAttemptsSummaryQuery } from "@/queries/security.queries";

export const metadata: Metadata = { title: "Sign-ins" };

const SignInsPage = async ({ searchParams }: PageProps<"/admin/security/logins">) => {
  const queryString = buildTableQueryString(await searchParams, LOGIN_ATTEMPTS_TABLE_BASE_CONFIG);

  return (
    <QueryPrefetch
      prefetch={(client) => Promise.all([client.prefetchQuery(loginAttemptsSummaryQuery()), client.prefetchQuery(loginAttemptsListQuery(queryString))])}
    >
      <div className="space-y-4">
        <LoginKpis />
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <LoginAttemptsTable />
          <FailingNetworks />
        </div>
      </div>
    </QueryPrefetch>
  );
};

export default SignInsPage;
