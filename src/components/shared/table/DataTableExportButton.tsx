"use client";

import type { Table } from "@tanstack/react-table";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { downloadCsv, toCsv } from "@/lib/table/csv";
import { getColumnLabel } from "./columnLabel";
import { ACTIONS_COLUMN_ID } from "./columns/createActionsColumn";
import { SELECT_COLUMN_ID } from "./columns/createSelectColumn";

// Exports the selected rows, or every row currently shown (all filtered rows
// for in-memory tables, the current page for server-paginated ones), using
// the visible columns in their on-screen order.
const DataTableExportButton = <TData,>({ table, fileName }: { table: Table<TData>; fileName: string }) => {
  const handleExport = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const rows = selectedRows.length > 0 ? selectedRows : table.getPrePaginationRowModel().rows;
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

    downloadCsv(`${fileName}-${format(new Date(), "yyyy-MM-dd")}`, toCsv(headers, body));
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
