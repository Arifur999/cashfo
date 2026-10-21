"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { usePersonHref } from "@/components/modules/Admin/UserManagement/usePersonHref";
import DataTable from "@/components/shared/table/DataTable";
import ErrorState from "@/components/smartly/ErrorState";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { workspaceOverviewQuery } from "@/queries/workspace.queries";
import type { IWorkspaceOverviewItem } from "@/types/workspace.types";
import WorkspaceKpis from "./WorkspaceKpis";
import { workspacesColumns } from "./workspacesColumns";
import { WORKSPACES_SORT_OPTIONS, WORKSPACES_TABLE_BASE_CONFIG, WORKSPACES_TABLE_CONFIG } from "./workspacesTable.config";

// A server list like Users: the page and rows per page live in the URL, the
// shared pager counts every owner with extras, and a stale ?page corrects
// itself. Being server-paged turns off the heads' sorting, which could only
// reorder the ten rows on screen; the Sort chip has the API order every
// owner instead (by add-on, workspaces, extras, name or plan).
const WorkspacesOverview = () => {
  const router = useRouter();
  const { t } = useLocale();
  // Marked as opened from here, so the menu and the way back return to
  // Workspaces, on this page of it.
  const personHref = usePersonHref("workspaces");
  // The page built the same query string, so the first render is hydrated.
  const { queryString, dataTableProps } = useServerDataTable<IWorkspaceOverviewItem>(WORKSPACES_TABLE_CONFIG);
  const query = useQuery({ ...workspaceOverviewQuery(queryString), placeholderData: keepPreviousData });
  const overview = query.data?.data;
  // The list is named by its order ("Biggest add-on first"), as the Sort
  // chip picks it; an unknown ?sort= reads as the default.
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort") || WORKSPACES_TABLE_BASE_CONFIG.defaults.sort;
  const sortLabel = (WORKSPACES_SORT_OPTIONS.find((option) => option.value === sort) ?? WORKSPACES_SORT_OPTIONS[0]).label;

  // An outage isn't "nobody has extra workspaces": say it didn't load, in
  // place of the figures and the list, and offer to try again.
  if (query.isError && !query.data) {
    return <ErrorState title={t("Couldn't load workspaces")} description={t("Try again in a moment.")} onRetry={() => void query.refetch()} />;
  }

  return (
    <div className="space-y-4">
      {overview && <WorkspaceKpis summary={overview.summary} />}
      <DataTable
        {...dataTableProps}
        {...toTableQueryProps(query)}
        data={overview?.items}
        columns={workspacesColumns}
        // The owner keeps 200px on a phone, so the plan is in view and the
        // figures one swipe away; a wider card gives it the rest.
        layout={{ rowHeight: 56, flexMinWidth: 200 }}
        getRowId={(row) => row.userId}
        title={sortLabel}
        onRowClick={(row) => router.push(personHref(row.userId))}
        emptyMessage="No users own more than one workspace yet."
        // The backend's sum (admin-workspaces.service.ts), word for word.
        footer="Add-on = extra business workspaces × the plan's monthly price × 50% (a yearly plan counts as a twelfth of its price). Group workspaces and the Free plan add nothing. This is an estimate; nobody is charged for it yet."
      />
    </div>
  );
};

export default WorkspacesOverview;
