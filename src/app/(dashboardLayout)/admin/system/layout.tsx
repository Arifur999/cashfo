import SystemHeaderAction from "@/components/modules/Admin/System/SystemHeaderAction";
import { SYSTEM_PAGE } from "@/components/modules/Admin/System/systemPage";
import SystemTabs from "@/components/modules/Admin/System/SystemTabs";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { openErrorCountQuery } from "@/queries/system.queries";

// Shared by the four System tabs, so switching tabs keeps the header and the
// tab bar in place. SUPER_ADMIN only -- proxy.ts turns other roles away
// before this renders. The open-error count feeds the Errors tab.
const SystemLayout = ({ children }: LayoutProps<"/admin/system">) => {
  return (
    <div className="space-y-4">
      <QueryPrefetch prefetch={(client) => client.prefetchQuery(openErrorCountQuery())}>
        <div className="space-y-4">
          <PageHeader {...SYSTEM_PAGE} actions={<SystemHeaderAction />} />
          <SystemTabs />
        </div>
      </QueryPrefetch>
      {children}
    </div>
  );
};

export default SystemLayout;
