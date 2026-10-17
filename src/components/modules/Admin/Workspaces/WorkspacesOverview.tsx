"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import DataTable from "@/components/shared/table/DataTable";
import T from "@/components/shared/T";
import { formatNumber } from "@/lib/number";
import { workspaceOverviewQuery } from "@/queries/workspace.queries";
import WorkspaceKpis from "./WorkspaceKpis";
import { workspacesColumns } from "./workspacesColumns";
import { TOP_WORKSPACES_QUERY } from "./workspacesTable.config";

const WorkspacesOverview = () => {
  const router = useRouter();
  // Same queryOptions as the page's prefetch, so the first render is hydrated.
  const query = useQuery(workspaceOverviewQuery(TOP_WORKSPACES_QUERY));
  const overview = query.data?.data;
  const total = query.data?.meta?.total;

  return (
    <div className="space-y-4">
      {overview && <WorkspaceKpis summary={overview.summary} />}
      <DataTable
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        data={overview?.items}
        columns={workspacesColumns}
        layout={{ rowHeight: 56 }}
        getRowId={(row) => row.userId}
        title="Biggest add-on first"
        toolbarAction={
          overview &&
          total !== undefined && (
            <span className="text-small text-ink-muted">
              <T values={{ shown: formatNumber(overview.items.length), total: formatNumber(total) }}>{"Showing {shown} of {total}"}</T>
            </span>
          )
        }
        onRowClick={(row) => router.push(`/admin/users/${row.userId}`)}
        emptyMessage="No users own more than one workspace yet."
        footer="Add-on = extra workspaces × plan price × 50%. Workspaces on the Free plan add nothing. This is an estimate; nobody is charged for it yet."
      />
    </div>
  );
};

export default WorkspacesOverview;
