import { SECURITY_PAGE } from "@/components/modules/Admin/Security/securityPage";
import SecurityHeaderAction from "@/components/modules/Admin/Security/SecurityHeaderAction";
import SecurityTabs from "@/components/modules/Admin/Security/SecurityTabs";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { securityFlagsSummaryQuery } from "@/queries/security.queries";

// Shared by the five Security tabs, so switching tabs keeps the header and
// the tab bar in place. The whole area is SUPER_ADMIN only -- proxy.ts turns
// other roles away before any of this renders. The flags summary feeds the
// tab's count and the "Last checked" time.
const SecurityLayout = ({ children }: LayoutProps<"/admin/security">) => {
  return (
    <div className="space-y-4">
      <QueryPrefetch prefetch={(client) => client.prefetchQuery(securityFlagsSummaryQuery())}>
        <div className="space-y-4">
          <PageHeader {...SECURITY_PAGE} actions={<SecurityHeaderAction />} />
          <SecurityTabs />
        </div>
      </QueryPrefetch>
      {children}
    </div>
  );
};

export default SecurityLayout;
