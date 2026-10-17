import { TOP_WORKSPACES_QUERY } from "@/components/modules/Admin/Workspaces/workspacesTable.config";
import WorkspacesOverview from "@/components/modules/Admin/Workspaces/WorkspacesOverview";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { workspaceOverviewQuery } from "@/queries/workspace.queries";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Workspaces");

const WorkspacesPage = () => {
  return (
    <div className="space-y-4">
      <PageHeader title="Workspaces" description="People with more than one workspace, and what the extra workspaces could earn as an add-on." />
      <QueryPrefetch prefetch={(client) => client.prefetchQuery(workspaceOverviewQuery(TOP_WORKSPACES_QUERY))}>
        <WorkspacesOverview />
      </QueryPrefetch>
    </div>
  );
};

export default WorkspacesPage;
