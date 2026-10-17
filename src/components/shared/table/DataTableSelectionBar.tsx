"use client";

import type { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { DataTableBulkAction } from "./dataTable.types";

interface DataTableSelectionBarProps<TData> {
  table: Table<TData>;
  bulkActions?: DataTableBulkAction<TData>[];
}

// Appears only while rows are selected: the count, any bulk actions, and a
// way out. Export lives in the toolbar and already honours the selection.
const DataTableSelectionBar = <TData,>({ table, bulkActions }: DataTableSelectionBarProps<TData>) => {
  const { translate } = useLocale();
  const selectedRows = table.getSelectedRowModel().rows;

  if (selectedRows.length === 0) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-5 mb-3 flex flex-wrap items-center gap-2 rounded-md border border-line bg-cream px-3 py-2 text-small"
    >
      <span className="font-medium">
        {selectedRows.length} {translate(selectedRows.length === 1 ? "row selected" : "rows selected")}
      </span>
      {bulkActions?.map(({ label, icon: Icon, onClick, destructive }) => (
        <Button
          key={label}
          size="sm"
          variant={destructive ? "destructive" : "outline"}
          className="h-7"
          onClick={() => onClick(selectedRows.map((row) => row.original))}
        >
          {Icon && <Icon aria-hidden="true" />}
          {translate(label)}
        </Button>
      ))}
      <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={() => table.resetRowSelection()}>
        <X aria-hidden="true" />
        {translate("Clear selection")}
      </Button>
    </div>
  );
};

export default DataTableSelectionBar;
