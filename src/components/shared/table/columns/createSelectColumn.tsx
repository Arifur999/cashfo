"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";

export const SELECT_COLUMN_ID = "select";

// Row-selection checkbox column. DataTable prepends it when
// enableRowSelection is set -- never add it to a columns file by hand.
export const createSelectColumn = <TData,>(): ColumnDef<TData> => ({
  id: SELECT_COLUMN_ID,
  header: ({ table }) => (
    <Checkbox
      checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
      onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))}
      aria-label="Select all rows on this page"
    />
  ),
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
      onClick={(event) => event.stopPropagation()}
      aria-label="Select row"
    />
  ),
  enableSorting: false,
  enableHiding: false,
  size: 40,
});
