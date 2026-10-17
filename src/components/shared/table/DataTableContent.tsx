"use client";

import { flexRender, type Column, type Header, type Table as TanStackTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import DataTableColumnHeader from "./DataTableColumnHeader";
import DataTableEmpty from "./DataTableEmpty";
import DataTableSkeleton from "./DataTableSkeleton";
import { ACTIONS_COLUMN_ID } from "./columns/createActionsColumn";
import type { DataTableLayout } from "./dataTable.types";
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
  layout?: DataTableLayout;
}

// The design's grid in a table: 20px at the card's edges, the gap split
// between neighbouring cells.
const EDGE = 20;
const GAP_CLASS = {
  12: "[&_td]:px-1.5 [&_th]:px-1.5",
  16: "[&_td]:px-2 [&_th]:px-2",
} as const;
const EDGE_CLASS = "[&_td:first-child]:pl-5 [&_th:first-child]:pl-5 [&_td:last-child]:pr-5 [&_th:last-child]:pr-5";
// Room the one flexible column keeps before the table scrolls sideways.
const FLEX_MIN = 220;

const trackWidth = <TData,>(column: Column<TData, unknown>, layout: DataTableLayout | undefined) =>
  column.id === ACTIONS_COLUMN_ID ? (layout?.actionsWidth ?? column.columnDef.meta?.width) : column.columnDef.meta?.width;

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
  layout,
}: DataTableContentProps<TData>) => {
  const { translate } = useLocale();
  const rows = table.getRowModel().rows;
  const columns = table.getVisibleLeafColumns();
  const columnCount = columns.length;
  const { gap = 12, rowHeight = 54, headPadding = 8 } = layout ?? {};
  // Widths given = the design's fixed grid; a list without any keeps the
  // browser's own column sizing.
  const widths = columns.map((column, index) => {
    const track = trackWidth(column, layout);
    if (track === undefined) return undefined;
    const padding = (index === 0 ? EDGE : gap / 2) + (index === columnCount - 1 ? EDGE : gap / 2);
    return track + padding;
  });
  const fixed = columns.some((column) => column.columnDef.meta?.width !== undefined && column.id !== ACTIONS_COLUMN_ID && column.id !== "select");
  const minWidth = fixed ? widths.reduce<number>((sum, width) => sum + (width ?? FLEX_MIN), 0) : undefined;

  return (
    // The max-height makes the table container the scroll box, which is what
    // lets the header stick while long pages scroll.
    <div className="relative overflow-hidden border-t border-line **:data-[slot=table-container]:max-h-[70vh] **:data-[slot=table-container]:overflow-auto">
      {isFetching && !isLoading && (
        <div className="absolute inset-x-0 top-0 z-20 h-0.5 animate-pulse bg-primary" role="progressbar" aria-label={translate("Refreshing")} />
      )}
      <Table
        aria-busy={isLoading || isFetching}
        className={cn(GAP_CLASS[gap], EDGE_CLASS, "[&_tbody_tr]:h-(--row-height)", fixed && "table-fixed")}
        style={{ "--row-height": `${rowHeight}px`, minWidth } as React.CSSProperties}
      >
        {fixed && (
          <colgroup>
            {columns.map((column, index) => (
              <col key={column.id} style={{ width: widths[index] }} />
            ))}
          </colgroup>
        )}
        {/* The design's column heads: a cream strip, 12px, no capitals. */}
        <TableHeader className="sticky top-0 z-10 bg-cream [&_tr]:border-line">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  // A list without a grid still keeps the checkbox and
                  // the menu narrow.
                  style={{ width: fixed ? undefined : widths[headerGroup.headers.indexOf(header)] }}
                  className={cn(
                    "h-auto text-caption font-medium text-ink-muted",
                    headPadding === 12 ? "py-3" : "py-2",
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
                      "py-2 text-body text-ink",
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
