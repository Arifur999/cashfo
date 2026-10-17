"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
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
  // The same query string the page prefetched with; the table's own config
  // waits for this page's status counts, which its tabs show.
  const queryString = buildTableQueryString(searchParams, MANAGE_OWNERS_TABLE_BASE_CONFIG);
  const query = useQuery({ ...ownersListQuery(queryString), placeholderData: keepPreviousData });
  const statusCounts = query.data?.data.statusCounts;
  const config = useMemo(() => buildManageOwnersTableConfig(statusCounts), [statusCounts]);
  const { dataTableProps } = useServerDataTable<IOwnerOverviewItem>(config);
  const { activeRow, openDialog, getDialogProps } = useRowDialogs<IOwnerOverviewItem, "reset">();

  // View opens the person. Only SUPER_ADMIN may reset, and only owners that
  // actually have a workspace.
  const actions = useMemo<DataTableActions<IOwnerOverviewItem>>(
    () => ({
      display: "inline",
      onView: (row) => router.push(`/admin/users/${row.userId}`),
      extra: [
        {
          label: "Reset data",
          destructive: true,
          onClick: (row) => openDialog("reset", row),
          hidden: (row) => !canResetData || !row.businessId,
        },
      ],
    }),
    [router, canResetData, openDialog],
  );

  return (
    <>
      <DataTable
        {...dataTableProps}
        {...toTableQueryProps(query)}
        data={query.data?.data.items}
        columns={manageOwnersColumns}
        getRowId={(row) => row.userId}
        actions={actions}
        emptyMessage="No owners match."
      />
      <ResetOwnerDataDialog owner={activeRow} {...getDialogProps("reset")} />
    </>
  );
};

export default ManageOwnersTable;
