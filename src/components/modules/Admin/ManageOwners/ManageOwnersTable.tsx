"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { usePersonHref } from "@/components/modules/Admin/UserManagement/usePersonHref";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { buildTableQueryString } from "@/lib/queryString";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { ownersListQuery } from "@/queries/owner.queries";
import type { IOwnerOverviewItem } from "@/types/owner.types";
import { manageOwnersColumns } from "./manageOwnersColumns";
import { buildManageOwnersTableConfig, MANAGE_OWNERS_TABLE_BASE_CONFIG } from "./manageOwnersTable.config";
import ResetOwnerDataDialog from "./ResetOwnerDataDialog";

const ManageOwnersTable = ({ canResetData }: { canResetData: boolean }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  // View and the row open the person, marked as opened from here (so the
  // menu and the way back return to Owners) with this list's tab, search
  // and page to come back to.
  const personHref = usePersonHref("owners");
  // The same query string the page prefetched with; the table's own config
  // waits for this page's status counts, which its tabs show.
  const queryString = buildTableQueryString(searchParams, MANAGE_OWNERS_TABLE_BASE_CONFIG);
  const query = useQuery({ ...ownersListQuery(queryString), placeholderData: keepPreviousData });
  const statusCounts = query.data?.data.statusCounts;
  const openStatus = searchParams.get("status");
  const config = useMemo(() => buildManageOwnersTableConfig(statusCounts, openStatus), [statusCounts, openStatus]);
  const { dataTableProps } = useServerDataTable<IOwnerOverviewItem>(config);
  const { activeRow, openDialog, getDialogProps } = useRowDialogs<IOwnerOverviewItem, "reset">();

  // Only SUPER_ADMIN may reset, and only owners that actually have a
  // workspace. The inline buttons keep their clicks from the row.
  const actions = useMemo<DataTableActions<IOwnerOverviewItem>>(
    () => ({
      display: "inline",
      // "View for Rahim Uddin", "Reset data for Rahim Uddin", to a screen reader.
      rowLabel: (row) => row.name,
      onView: (row) => router.push(personHref(row.userId)),
      extra: [
        {
          label: "Reset data",
          destructive: true,
          onClick: (row) => openDialog("reset", row),
          hidden: (row) => !canResetData || !row.businessId,
        },
      ],
    }),
    [router, personHref, canResetData, openDialog],
  );

  return (
    <>
      <DataTable
        {...dataTableProps}
        {...toTableQueryProps(query)}
        data={query.data?.data.items}
        columns={manageOwnersColumns}
        // Room for View and the Bangla ডেটা রিসেট করুন side by side. Every
        // column keeps its px, so the buttons never spill over the Workspace
        // column: the table is 1060px at least (960 of tracks, 100 of
        // padding) and scrolls sideways in a card narrower than that, which
        // includes a 1280 laptop's.
        layout={{ rowHeight: 58, actionsWidth: 190, flexMinWidth: 220 }}
        getRowId={(row) => row.userId}
        actions={actions}
        // A click opens the person. (Not rowHref yet: its row link would
        // prefetch every person on the page.)
        onRowClick={(row) => router.push(personHref(row.userId))}
        emptyMessage="No owners match."
        // An outage isn't "no owners match": the table says the list didn't
        // load, with Try again.
        errorTitle="Couldn't load the owners"
      />
      <ResetOwnerDataDialog owner={activeRow} {...getDialogProps("reset")} />
    </>
  );
};

export default ManageOwnersTable;
