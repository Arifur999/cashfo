"use client";

import type { ColumnDef } from "@tanstack/react-table";
import DataTableRowActions from "../DataTableRowActions";
import type { DataTableActions } from "../dataTable.types";

export const ACTIONS_COLUMN_ID = "actions";

// DataTable appends this automatically when `actions` is passed (and pins it
// to the right edge) -- a columns file never defines its own actions column.
export const createActionsColumn = <TData,>(actions: DataTableActions<TData>): ColumnDef<TData> => ({
  id: ACTIONS_COLUMN_ID,
  header: () => <span className="sr-only">Actions</span>,
  cell: ({ row }) => (
    <div className="flex justify-end">
      <DataTableRowActions row={row.original} actions={actions} />
    </div>
  ),
  enableSorting: false,
  enableHiding: false,
  size: 56,
});
