"use client";

import type { Table } from "@tanstack/react-table";
import { X } from "lucide-react";
import Button from "@/components/smartly/Button";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { DataTableBulkAction } from "./dataTable.types";
import { plural } from "@/lib/i18n/message";

interface DataTableSelectionBarProps<TData> {
  table: Table<TData>;
  bulkActions?: DataTableBulkAction<TData>[];
}

// The bar's 28px buttons; a destructive one outlined in red, like a row's.
const BUTTON = "h-7 px-2.5";
const DANGER = "border-expense-line text-expense hover:bg-expense-soft";

// Appears only while rows are selected: the count (in the reader's digits),
// any bulk actions, and a way out. Export lives in the page header and
// already honours the selection.
const DataTableSelectionBar = <TData,>({ table, bulkActions }: DataTableSelectionBarProps<TData>) => {
  const { translate, locale } = useLocale();
  const selectedRows = table.getSelectedRowModel().rows;

  if (selectedRows.length === 0) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-5 mb-3 flex flex-wrap items-center gap-2 rounded-md border border-line bg-strip px-3 py-2 text-small"
    >
      <span className="font-medium">
        {plural(translate, selectedRows.length, "{count} row selected", "{count} rows selected", { count: formatCount(selectedRows.length, locale) })}
      </span>
      {bulkActions?.map(({ label, icon: Icon, onClick, destructive }) => (
        <Button
          key={label}
          variant="secondary"
          size="sm"
          className={cn(BUTTON, destructive && DANGER)}
          onClick={() => onClick(selectedRows.map((row) => row.original))}
        >
          {Icon && <Icon aria-hidden="true" />}
          {translate(label)}
        </Button>
      ))}
      <Button variant="ghost" size="sm" className={cn(BUTTON, "ml-auto")} onClick={() => table.resetRowSelection()}>
        <X aria-hidden="true" />
        {translate("Clear selection")}
      </Button>
    </div>
  );
};

export default DataTableSelectionBar;
