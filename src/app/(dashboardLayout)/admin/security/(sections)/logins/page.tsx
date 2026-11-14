import { redirect } from "next/navigation";
import { hrefWithoutUnknownWithin } from "@/components/modules/Admin/Security/knownWithin";
import FailingNetworks from "@/components/modules/Admin/Security/Logins/FailingNetworks";
import LoginAttemptsTable from "@/components/modules/Admin/Security/Logins/LoginAttemptsTable";
import { LOGIN_ATTEMPTS_TABLE_BASE_CONFIG } from "@/components/modules/Admin/Security/Logins/loginAttemptsTable.config";
import LoginKpis from "@/components/modules/Admin/Security/Logins/LoginKpis";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { buildTableQueryString } from "@/lib/queryString";
import { loginAttemptsListQuery, loginAttemptsSummaryQuery } from "@/queries/security.queries";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Sign-ins");

const SignInsPage = async ({ searchParams }: PageProps<"/admin/security/logins">) => {
  const params = await searchParams;
  // A window the API refuses would fail every read: open on the default instead.
  const fixed = hrefWithoutUnknownWithin("/admin/security/logins", params);
  if (fixed !== null) redirect(fixed);
  const queryString = buildTableQueryString(params, LOGIN_ATTEMPTS_TABLE_BASE_CONFIG);

  return (
    <QueryPrefetch
      prefetch={(client) => Promise.all([client.prefetchQuery(loginAttemptsSummaryQuery()), client.prefetchQuery(loginAttemptsListQuery(queryString))])}
    >
      <div className="space-y-4.5">
        <LoginKpis />
        {/* The table needs about 800px for its four columns, so the side
            card only sits beside it on wide screens (the design's 1440). */}
        <div className="grid items-start gap-4 min-[1400px]:grid-cols-[minmax(0,1fr)_320px]">
          <LoginAttemptsTable />
          <FailingNetworks />
        </div>
      </div>
    </QueryPrefetch>
  );
};

export default SignInsPage;
