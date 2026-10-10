"use client";

import type { Table } from "@tanstack/react-table";
import { RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getColumnLabel = <TData,>(column: ReturnType<Table<TData>["getAllColumns"]>[number]) => {
  const header = column.columnDef.header;
  return column.columnDef.meta?.label ?? (typeof header === "string" ? header : column.id);
};

// Column show/hide menu. With a `tableId` on the DataTable the choice is
// remembered per browser (see usePersistentState).
const DataTableViewOptions = <TData,>({ table }: { table: Table<TData> }) => {
  const hideableColumns = table.getAllColumns().filter((column) => column.getCanHide());

  if (hideableColumns.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Settings2 aria-hidden="true" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hideableColumns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onCheckedChange={(checked) => column.toggleVisibility(Boolean(checked))}
            // Keep the menu open so several columns can be toggled in a row.
            onSelect={(event) => event.preventDefault()}
          >
            {getColumnLabel(column)}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => table.resetColumnVisibility(true)}>
          <RotateCcw aria-hidden="true" /> Show all
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DataTableViewOptions;
