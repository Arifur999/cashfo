import { redirect } from "next/navigation";
import { WORKSPACES_TABLE_BASE_CONFIG } from "@/components/modules/Admin/Workspaces/workspacesTable.config";
import WorkspacesOverview from "@/components/modules/Admin/Workspaces/WorkspacesOverview";
import PageHeader from "@/components/shared/PageHeader";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { adminPageTitle } from "@/lib/i18n/locale";
import { userListFor } from "@/lib/navItem";
import { buildTableQueryString } from "@/lib/queryString";
import { pageHref, pastEnd } from "@/lib/table/pageParams";
import { workspaceOverviewQuery } from "@/queries/workspace.queries";
import { getWorkspaceOverview } from "@/services/workspace.services";

export const generateMetadata = adminPageTitle("Workspaces");

const WORKSPACES_ROUTE = userListFor("workspaces").href;

const WorkspacesPage = async ({ searchParams }: PageProps<"/admin/workspaces">) => {
  const params = await searchParams;
  const queryString = buildTableQueryString(params, WORKSPACES_TABLE_BASE_CONFIG);
  // Fetched here, so a page past the end (an old link, owners gone since)
  // opens the last one instead of an empty list. An outage is left to the
  // overview, which says so and offers a retry.
  const overview = await getWorkspaceOverview(queryString).catch(() => null);
  const last = overview?.meta ? pastEnd(overview.meta.page, overview.meta.totalPage, overview.meta.total) : null;
  if (last !== null) redirect(pageHref(WORKSPACES_ROUTE, params, last));

  return (
    <div className="space-y-4.5">
      <PageHeader title="Workspaces" description="People with more than one workspace, and what the extra workspaces could earn as an add-on." />
      <QueryPrefetch
        prefetch={async (client) => {
          // Still one request: the page fetched above seeds the list's query.
          if (overview) client.setQueryData(workspaceOverviewQuery(queryString).queryKey, overview);
        }}
      >
        <WorkspacesOverview />
      </QueryPrefetch>
    </div>
  );
};

export default WorkspacesPage;
