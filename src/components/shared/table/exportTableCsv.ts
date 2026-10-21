import type { Row, Table } from "@tanstack/react-table";
import { datedFileName, downloadCsv } from "@/lib/download";
import { ACTIONS_COLUMN_ID } from "./columns/createActionsColumn";
import { SELECT_COLUMN_ID } from "./columns/createSelectColumn";
import { tableCsv } from "./tableCsv";

// Tree tables: each parent followed by its (filtered, sorted) children,
// whether or not they're expanded on screen.
const flattenRows = <TData,>(rows: Row<TData>[]): Row<TData>[] => rows.flatMap((row) => [row, ...flattenRows(row.subRows)]);

// The visible columns in their on-screen order, without the checkbox and the
// actions.
const downloadRows = <TData,>(table: Table<TData>, rows: { original: TData; index: number }[], fileName: string) => {
  const columns = table.getVisibleLeafColumns().filter((column) => column.id !== SELECT_COLUMN_ID && column.id !== ACTIONS_COLUMN_ID);
  downloadCsv(tableCsv(columns, rows), datedFileName(fileName));
};

// Downloads the selected rows, or every row the table holds (all filtered
// rows for an in-memory table, the current page for a server-paginated one).
export const exportTableCsv = <TData,>(table: Table<TData>, fileName: string) => {
  const selectedRows = table.getSelectedRowModel().rows;
  downloadRows(table, selectedRows.length > 0 ? selectedRows : flattenRows(table.getPrePaginationRowModel().rows), fileName);
};

// Downloads rows fetched for the export (every page of a server list), with
// the table's columns, exactly as its own rows would be.
export const exportRowsCsv = <TData,>(table: Table<TData>, rows: TData[], fileName: string) =>
  downloadRows(
    table,
    rows.map((original, index) => ({ original, index })),
    fileName,
  );
