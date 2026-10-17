import type { Row, Table } from "@tanstack/react-table";
import { datedFileName, downloadCsv } from "@/lib/download";
import { toCsv } from "@/lib/table/csv";
import { getColumnLabel } from "./columnLabel";
import { ACTIONS_COLUMN_ID } from "./columns/createActionsColumn";
import { SELECT_COLUMN_ID } from "./columns/createSelectColumn";

// Tree tables: each parent followed by its (filtered, sorted) children,
// whether or not they're expanded on screen.
const flattenRows = <TData,>(rows: Row<TData>[]): Row<TData>[] => rows.flatMap((row) => [row, ...flattenRows(row.subRows)]);

// Downloads the selected rows, or every row shown (all filtered rows for an
// in-memory table, the current page for a server-paginated one), with the
// visible columns in their on-screen order.
export const exportTableCsv = <TData,>(table: Table<TData>, fileName: string) => {
  const selectedRows = table.getSelectedRowModel().rows;
  const rows = selectedRows.length > 0 ? selectedRows : flattenRows(table.getPrePaginationRowModel().rows);
  const columns = table.getVisibleLeafColumns().filter((column) => column.id !== SELECT_COLUMN_ID && column.id !== ACTIONS_COLUMN_ID);

  const headers = columns.map((column) => getColumnLabel(column));
  const body = rows.map((row) =>
    columns.map((column) => {
      const exportValue = column.columnDef.meta?.exportValue;
      return exportValue ? exportValue(row.original) : row.getValue(column.id);
    }),
  );

  downloadCsv(toCsv(headers, body), datedFileName(fileName));
};
