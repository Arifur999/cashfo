"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useMemo } from "react";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { ownersListQuery } from "@/queries/owner.queries";
import type { IOwnerOverviewItem } from "@/types/owner.types";
import { manageOwnersColumns } from "./manageOwnersColumns";
import { MANAGE_OWNERS_TABLE_CONFIG } from "./manageOwnersTable.config";
import ResetOwnerDataDialog from "./ResetOwnerDataDialog";

const ManageOwnersTable = ({ canResetData }: { canResetData: boolean }) => {
  const { queryString, dataTableProps } = useServerDataTable<IOwnerOverviewItem>(MANAGE_OWNERS_TABLE_CONFIG);
  const query = useQuery({ ...ownersListQuery(queryString), placeholderData: keepPreviousData });
  const { activeRow, openDialog, getDialogProps } = useRowDialogs<IOwnerOverviewItem, "reset">();

  // Only SUPER_ADMIN may reset, and only owners that actually have a workspace.
  const actions = useMemo<DataTableActions<IOwnerOverviewItem> | undefined>(
    () =>
      canResetData
        ? {
            extra: [
              {
                label: "Reset workspace data",
                icon: Trash2,
                destructive: true,
                onClick: (row) => openDialog("reset", row),
                hidden: (row) => !row.businessId,
              },
            ],
          }
        : undefined,
    [canResetData, openDialog],
  );

  return (
    <>
      <DataTable
        {...dataTableProps}
        {...toTableQueryProps(query)}
        data={query.data?.data ?? []}
        columns={manageOwnersColumns}
        getRowId={(row) => row.userId}
        tableId="manage-owners"
        exportFileName="owners"
        actions={actions}
        emptyMessage="No owners found."
      />
      <ResetOwnerDataDialog owner={activeRow} {...getDialogProps("reset")} />
    </>
  );
};

export default ManageOwnersTable;
