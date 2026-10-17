"use client";

import type { ColumnDef } from "@tanstack/react-table";
import DataTableInlineActions from "../DataTableInlineActions";
import DataTableRowActions from "../DataTableRowActions";
import type { DataTableActions } from "../dataTable.types";
import T from "../../T";

export const ACTIONS_COLUMN_ID = "actions";

// DataTable appends this automatically when `actions` is passed (and pins it
// to the right edge) -- a columns file never defines its own actions column.
export const createActionsColumn = <TData,>(actions: DataTableActions<TData>): ColumnDef<TData> =>
  actions.display === "inline" || actions.display === "split"
    ? {
        id: ACTIONS_COLUMN_ID,
        header: actions.heading === false ? () => <span className="sr-only"><T>Actions</T></span> : "Actions",
        meta: { headerClassName: "text-right" },
        cell: ({ row }) => <DataTableInlineActions row={row.original} actions={actions} />,
        enableSorting: false,
        enableHiding: false,
      }
    : {
        id: ACTIONS_COLUMN_ID,
        header: () => <span className="sr-only"><T>Actions</T></span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DataTableRowActions row={row.original} actions={actions} />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        meta: { width: 32 },
      };
