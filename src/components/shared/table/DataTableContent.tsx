"use client";

import { flexRender, type Header, type Table as TanStackTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import DataTableColumnHeader from "./DataTableColumnHeader";
import DataTableEmpty from "./DataTableEmpty";
import DataTableSkeleton from "./DataTableSkeleton";
import { getPinnedClassName } from "./pinnedColumn";

interface DataTableContentProps<TData> {
  table: TanStackTable<TData>;
  isLoading: boolean;
  isFetching: boolean;
  emptyMessage: string;
  canReset: boolean;
  onReset: () => void;
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: TData) => string | undefined;
}

// A plain-string header gets the sort/hide menu automatically.
const renderHeader = <TData,>(header: Header<TData, unknown>) => {
  const content = header.column.columnDef.header;
  if (typeof content === "string") {
    return <DataTableColumnHeader column={header.column} title={content} align={header.column.columnDef.meta?.align} />;
  }
  return flexRender(content, header.getContext());
};

const DataTableContent = <TData,>({
  table,
  isLoading,
  isFetching,
  emptyMessage,
  canReset,
  onReset,
  onRowClick,
  rowClassName,
}: DataTableContentProps<TData>) => {
  const { translate } = useLocale();
  const rows = table.getRowModel().rows;
  const columnCount = table.getVisibleLeafColumns().length;

  return (
    // The max-height makes the table container the scroll box, which is what
    // lets the header stick while long pages scroll.
    <div className="relative overflow-hidden border-t border-line **:data-[slot=table-container]:max-h-[70vh] **:data-[slot=table-container]:overflow-auto">
      {isFetching && !isLoading && (
        <div className="absolute inset-x-0 top-0 z-20 h-0.5 animate-pulse bg-primary" role="progressbar" aria-label={translate("Refreshing")} />
      )}
      <Table aria-busy={isLoading || isFetching}>
        {/* The design's column heads: a cream strip, 12px, no capitals. */}
        <TableHeader className="sticky top-0 z-10 bg-cream [&_tr]:border-line">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  // Only columns that set an explicit size (select, actions)
                  // get a fixed width; the rest size to content.
                  style={{ width: header.column.columnDef.size ? header.getSize() : undefined }}
                  className={cn(
                    "h-9.5 px-5 text-caption font-medium text-ink-muted first:pl-5 last:pr-5",
                    header.column.columnDef.meta?.align === "right" && "text-right",
                    header.column.columnDef.meta?.headerClassName,
                    getPinnedClassName(header.column, true),
                  )}
                >
                  {header.isPlaceholder ? null : renderHeader(header)}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <DataTableSkeleton columnCount={columnCount} rowCount={Math.min(table.getState().pagination.pageSize, 10)} />
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columnCount}>
                <DataTableEmpty message={emptyMessage} canReset={canReset} onReset={onReset} />
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                className={cn("group/row border-surface-sunken hover:bg-cream/60", onRowClick && "cursor-pointer", rowClassName?.(row.original))}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === "Enter" && event.target === event.currentTarget) {
                          onRowClick(row.original);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "px-5 py-3 text-body text-ink",
                      cell.column.columnDef.meta?.align === "right" && "text-right",
                      cell.column.columnDef.meta?.cellClassName,
                      getPinnedClassName(cell.column),
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default DataTableContent;
