"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import DataTable from "@/components/shared/table/DataTable";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { workspaceOverviewQuery } from "@/queries/workspace.queries";
import type { IWorkspaceOverviewItem } from "@/types/workspace.types";
import WorkspaceKpis from "./WorkspaceKpis";
import { workspacesColumns } from "./workspacesColumns";
import { WORKSPACES_TABLE_CONFIG } from "./workspacesTable.config";
import T from "@/components/shared/T";

const WorkspacesOverview = () => {
  const router = useRouter();
  const { queryString, dataTableProps } = useServerDataTable<IWorkspaceOverviewItem>(WORKSPACES_TABLE_CONFIG);
  // Same queryOptions as the page's prefetch, so the first render is hydrated;
  // keepPreviousData keeps rows on screen while the next page loads.
  const query = useQuery({ ...workspaceOverviewQuery(queryString), placeholderData: keepPreviousData });
  const overview = query.data?.data;

  return (
    <div className="space-y-4">
      {overview && <WorkspaceKpis summary={overview.summary} />}
      <DataTable
        {...dataTableProps}
        {...toTableQueryProps(query)}
        data={overview?.items}
        columns={workspacesColumns}
        getRowId={(row) => row.userId}
        tableId="workspaces"
        title="Biggest add-on first"
        exportFileName="workspaces"
        onRowClick={(row) => router.push(`/admin/users/${row.userId}`)}
        emptyMessage="No users own more than one workspace yet."
        footer={
          <>
            <Info className="size-3.75 shrink-0 text-ink-muted" aria-hidden="true" />
            <T>Add-on = extra workspaces × plan price × 50%. Workspaces on the Free plan add nothing. This is an estimate; nobody is charged for it yet.</T>
          </>
        }
      />
    </div>
  );
};

export default WorkspacesOverview;
