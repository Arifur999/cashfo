import type { Metadata } from "next";
import LoginAttemptsTable from "@/components/modules/Admin/Security/Logins/LoginAttemptsTable";
import { LOGIN_ATTEMPTS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/Security/Logins/loginAttemptsTable.config";
import LoginSummary from "@/components/modules/Admin/Security/Logins/LoginSummary";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { buildTableQueryString } from "@/lib/queryString";
import { loginAttemptsListQuery, loginAttemptsSummaryQuery } from "@/queries/security.queries";

export const metadata: Metadata = { title: "Login Monitoring" };

const LoginMonitoringPage = async ({ searchParams }: PageProps<"/admin/security/logins">) => {
  const queryString = buildTableQueryString(await searchParams, LOGIN_ATTEMPTS_TABLE_BASE_CONFIG);

  return (
    <QueryPrefetch
      prefetch={(client) =>
        Promise.all([client.prefetchQuery(loginAttemptsSummaryQuery()), client.prefetchQuery(loginAttemptsListQuery(queryString))])
      }
    >
      <LoginSummary />
      <LoginAttemptsTable />
    </QueryPrefetch>
  );
};

export default LoginMonitoringPage;
