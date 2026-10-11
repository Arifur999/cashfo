"use client";

import type { Row, Table } from "@tanstack/react-table";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { downloadCsv } from "@/lib/download";
import { toCsv } from "@/lib/table/csv";
import { getColumnLabel } from "./columnLabel";
import { ACTIONS_COLUMN_ID } from "./columns/createActionsColumn";
import { SELECT_COLUMN_ID } from "./columns/createSelectColumn";

// Tree tables: each parent followed by its (filtered, sorted) children,
// whether or not they're expanded on screen.
const flattenRows = <TData,>(rows: Row<TData>[]): Row<TData>[] => rows.flatMap((row) => [row, ...flattenRows(row.subRows)]);

// Exports the selected rows, or every row currently shown (all filtered rows
// for in-memory tables, the current page for server-paginated ones), using
// the visible columns in their on-screen order.
const DataTableExportButton = <TData,>({ table, fileName }: { table: Table<TData>; fileName: string }) => {
  const handleExport = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const rows = selectedRows.length > 0 ? selectedRows : flattenRows(table.getPrePaginationRowModel().rows);
    const columns = table
      .getVisibleLeafColumns()
      .filter((column) => column.id !== SELECT_COLUMN_ID && column.id !== ACTIONS_COLUMN_ID);

    const headers = columns.map((column) => getColumnLabel(column));
    const body = rows.map((row) =>
      columns.map((column) => {
        const exportValue = column.columnDef.meta?.exportValue;
        return exportValue ? exportValue(row.original) : row.getValue(column.id);
      }),
    );

    downloadCsv(toCsv(headers, body), `${fileName}-${format(new Date(), "yyyy-MM-dd")}`);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="sm" className="h-8" onClick={handleExport}>
          <Download aria-hidden="true" />
          Export
        </Button>
      </TooltipTrigger>
      <TooltipContent>Download the selected rows, or all rows shown, as CSV</TooltipContent>
    </Tooltip>
  );
};

export default DataTableExportButton;
