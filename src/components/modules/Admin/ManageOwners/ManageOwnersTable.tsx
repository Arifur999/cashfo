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
  const config = useMemo(() => buildManageOwnersTableConfig(statusCounts), [statusCounts]);
  const { dataTableProps } = useServerDataTable<IOwnerOverviewItem>(config);
  const { activeRow, openDialog, getDialogProps } = useRowDialogs<IOwnerOverviewItem, "reset">();
  // An outage isn't "no owners match": say the list didn't load.
  const failed = query.isError && !query.data;

  // Only SUPER_ADMIN may reset, and only owners that actually have a
  // workspace. The inline buttons keep their clicks from the row.
  const actions = useMemo<DataTableActions<IOwnerOverviewItem>>(
    () => ({
      display: "inline",
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
        // Room for View and the Bangla ডেটা রিসেট করুন side by side at 1280.
        layout={{ rowHeight: 58, actionsWidth: 210 }}
        getRowId={(row) => row.userId}
        actions={actions}
        onRowClick={(row) => router.push(personHref(row.userId))}
        emptyMessage={failed ? "Couldn't load the owners. Try again in a moment." : "No owners match."}
      />
      <ResetOwnerDataDialog owner={activeRow} {...getDialogProps("reset")} />
    </>
  );
};

export default ManageOwnersTable;
