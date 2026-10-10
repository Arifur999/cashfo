"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import DataTable from "@/components/shared/table/DataTable";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { workspaceOverviewQuery } from "@/queries/workspace.queries";
import type { IWorkspaceOverviewItem } from "@/types/workspace.types";
import WorkspaceSummaryStats from "./WorkspaceSummaryStats";
import { workspacesColumns } from "./workspacesColumns";
import { WORKSPACES_TABLE_CONFIG } from "./workspacesTable.config";

const WorkspacesOverview = () => {
  const { queryString, dataTableProps } = useServerDataTable<IWorkspaceOverviewItem>(WORKSPACES_TABLE_CONFIG);
  // Same queryOptions as the page's prefetch, so the first render is hydrated;
  // keepPreviousData keeps rows on screen while the next page loads.
  const query = useQuery({ ...workspaceOverviewQuery(queryString), placeholderData: keepPreviousData });
  const overview = query.data?.data;

  return (
    <div className="space-y-6">
      {overview && <WorkspaceSummaryStats summary={overview.summary} />}
      <DataTable
        {...dataTableProps}
        {...toTableQueryProps(query)}
        data={overview?.items}
        columns={workspacesColumns}
        getRowId={(row) => row.userId}
        tableId="workspaces"
        exportFileName="workspaces"
        emptyMessage="No users own more than one workspace yet."
      />
    </div>
  );
};

export default WorkspacesOverview;
