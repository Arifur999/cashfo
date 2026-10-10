import type { Metadata } from "next";
import { WORKSPACES_TABLE_CONFIG } from "@/components/modules/Admin/Workspaces/workspacesTable.config";
import WorkspacesOverview from "@/components/modules/Admin/Workspaces/WorkspacesOverview";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { buildTableQueryString } from "@/lib/queryString";
import { workspaceOverviewQuery } from "@/queries/workspace.queries";

export const metadata: Metadata = { title: "Workspaces" };

const WorkspacesPage = async ({ searchParams }: PageProps<"/admin/workspaces">) => {
  const queryString = buildTableQueryString(await searchParams, WORKSPACES_TABLE_CONFIG);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspaces"
        description="Real end-user accounts with more than one workspace, and the estimated add-on revenue they represent."
      />
      <QueryPrefetch prefetch={(client) => client.prefetchQuery(workspaceOverviewQuery(queryString))}>
        <WorkspacesOverview />
      </QueryPrefetch>
    </div>
  );
};

export default WorkspacesPage;
