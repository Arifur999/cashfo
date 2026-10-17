import { WORKSPACES_TABLE_CONFIG } from "@/components/modules/Admin/Workspaces/workspacesTable.config";
import WorkspacesOverview from "@/components/modules/Admin/Workspaces/WorkspacesOverview";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { buildTableQueryString } from "@/lib/queryString";
import { workspaceOverviewQuery } from "@/queries/workspace.queries";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Workspaces");

const WorkspacesPage = async ({ searchParams }: PageProps<"/admin/workspaces">) => {
  const queryString = buildTableQueryString(await searchParams, WORKSPACES_TABLE_CONFIG);

  return (
    <div className="space-y-4">
      <PageHeader title="Workspaces" description="People with more than one workspace, and what the extra workspaces could earn as an add-on." />
      <QueryPrefetch prefetch={(client) => client.prefetchQuery(workspaceOverviewQuery(queryString))}>
        <WorkspacesOverview />
      </QueryPrefetch>
    </div>
  );
};

export default WorkspacesPage;
