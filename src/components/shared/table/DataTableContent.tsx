"use client";

import { flexRender, type Column, type Header, type Table as TanStackTable } from "@tanstack/react-table";
import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import ErrorState from "@/components/smartly/ErrorState";
import { LIST_DIVIDER, LIST_HEAD, LIST_INSET } from "@/components/smartly/list/recipes";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { keptTableWidth } from "@/lib/table/columnWidths";
import { cn } from "@/lib/utils";
import DataTableColumnHeader from "./DataTableColumnHeader";
import DataTableEmpty from "./DataTableEmpty";
import DataTableSkeleton from "./DataTableSkeleton";
import { ACTIONS_COLUMN_ID } from "./columns/createActionsColumn";
import { SELECT_COLUMN_ID } from "./columns/createSelectColumn";
import type { DataTableLayout } from "./dataTable.types";
import { getPinnedClassName } from "./pinnedColumn";

interface DataTableContentProps<TData> {
  table: TanStackTable<TData>;
  isLoading: boolean;
  isFetching: boolean;
  emptyMessage: string;
  emptyAction?: React.ReactNode;
  canReset: boolean;
  onReset: () => void;
  // A failed read: with no rows to show, its error takes the table's place.
  isError: boolean;
  onRetry?: () => void;
  errorTitle: string;
  errorDescription?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  rowHref?: (row: TData) => string | undefined;
  rowClassName?: (row: TData) => string | undefined;
  layout?: DataTableLayout;
}

// The design's grid in a table: 18px at the card's edges, the gap split
// between neighbouring cells.
const EDGE = 18;
const GAP_CLASS = {
  12: "[&_td]:px-1.5 [&_th]:px-1.5",
  16: "[&_td]:px-2 [&_th]:px-2",
} as const;
const EDGE_CLASS = "[&_td:first-child]:pl-4.5 [&_th:first-child]:pl-4.5 [&_td:last-child]:pr-4.5 [&_th:last-child]:pr-4.5";
// The list card's width on a 1440 board: the page less the sidebar and the
// 32px margins.
const DESIGN_WIDTH = 1130;
// Below this a gridded table scrolls sideways instead of crushing its columns.
const MIN_TABLE = "min-w-180";
const MIN_TABLE_PX = 720;
// The column heads every list draws (LIST_HEAD: the light table-head band,
// 12px, no capitals), less the list's inset: GAP_CLASS and EDGE_CLASS pad
// each cell, 20px at the card's edges. Each head cell is opaque, so the
// head can stick over the rows.
const INSET = new Set(LIST_INSET.split(" "));
const HEAD = LIST_HEAD.split(" ")
  .filter((name) => !INSET.has(name))
  .join(" ");

// A row that is a link (rowHref). Every cell but the checkbox and the
// actions holds a copy of the link behind its content, so a click anywhere
// in the row opens the page, and Ctrl or the middle button a new tab: the
// content lets the pointer through, all but its own buttons, links and
// boxes. Only the first cell's copy is in the tab order and read out, named
// by that cell. Its focus ring, 2px and inset like a list row's, is drawn by
// the cells, not the row: each cell paints on its own layer (LINK_CELL, or
// a pinned cell's opaque sticky background), which would cover an outline
// on the <tr>. Every cell draws the top and bottom edges, the first and last
// cells the sides.
const OWN_COLUMNS = new Set([SELECT_COLUMN_ID, ACTIONS_COLUMN_ID]);
const LINK_CELL = "relative isolate pointer-events-none [&_:is(a,button,input,select,textarea,label,summary,[role=button],[role=checkbox],[role=switch],[tabindex])]:pointer-events-auto";
const ROW_LINK = "pointer-events-auto absolute inset-0 -z-10 focus-visible:outline-none";
const LINK_FOCUS = [
  "[&:has([data-slot=table-row-link]:focus-visible)>td]:shadow-[inset_0_2px_0_var(--focus-ring),inset_0_-2px_0_var(--focus-ring)]",
  "[&:has([data-slot=table-row-link]:focus-visible)>td:first-child]:shadow-[inset_2px_0_0_var(--focus-ring),inset_0_2px_0_var(--focus-ring),inset_0_-2px_0_var(--focus-ring)]",
  "[&:has([data-slot=table-row-link]:focus-visible)>td:last-child]:shadow-[inset_-2px_0_0_var(--focus-ring),inset_0_2px_0_var(--focus-ring),inset_0_-2px_0_var(--focus-ring)]",
  "[&:has([data-slot=table-row-link]:focus-visible)>td:first-child:last-child]:shadow-[inset_0_0_0_2px_var(--focus-ring)]",
].join(" ");

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
  emptyAction,
  canReset,
  onReset,
  isError,
  onRetry,
  errorTitle,
  errorDescription,
  onRowClick,
  rowHref,
  rowClassName,
  layout,
}: DataTableContentProps<TData>) => {
  const { translate } = useLocale();
  const frame = useRef<HTMLDivElement>(null);
  // Ties each row's link to the cell that names it.
  const tableId = useId();
  const { pageIndex, pageSize } = table.getState().pagination;
  const rows = table.getRowModel().rows;
  const columns = table.getVisibleLeafColumns();
  const columnCount = columns.length;
  // The read failed and there is nothing to show; rows already in stay.
  const failed = isError && !isLoading && table.getCoreRowModel().rows.length === 0;
  // Another page starts at its first row, not where the rows box was
  // scrolled to on the last one.
  useEffect(() => {
    frame.current?.querySelector<HTMLElement>("[data-slot=table-container]")?.scrollTo({ top: 0 });
  }, [pageIndex, pageSize]);
  const { gap = 12, rowHeight = 54, headPadding = 9, designWidth = DESIGN_WIDTH, flexMinWidth } = layout ?? {};
  const padding = (index: number) => (index === 0 ? EDGE : gap / 2) + (index === columnCount - 1 ? EDGE : gap / 2);
  // Widths given = the design's fixed grid; a list without any keeps the
  // browser's own column sizing.
  const tracks = columns.map((column) => trackWidth(column, layout));
  const widths = tracks.map((track, index) => (track === undefined ? undefined : track + padding(index)));
  const fixed = columns.some((column) => column.columnDef.meta?.width !== undefined && column.id !== ACTIONS_COLUMN_ID && column.id !== "select");
  // layout.flexMinWidth: each column keeps its px, the one without a width
  // gives way, and the table stops shrinking at what they all need.
  const minWidth = fixed && flexMinWidth !== undefined ? keptTableWidth(tracks.map((track, index) => ({ track, padding: padding(index) })), flexMinWidth, MIN_TABLE_PX) : undefined;
  const kept = minWidth !== undefined;
  // Otherwise each column's share of the board's card: exactly the board's
  // px at 1440, in proportion at 1280 or 1920. (Tables treat a px/% mix
  // like min() as auto, so it is a plain percentage.)
  const colWidth = (width: number | undefined) => {
    if (width === undefined) return undefined;
    return kept ? `${width}px` : `${((width / designWidth) * 100).toFixed(3)}%`;
  };

  return (
    // The max-height makes the table container the scroll box, which is what
    // lets the header stick while long pages scroll.
    <div ref={frame} className="relative overflow-hidden border-t border-line **:data-[slot=table-container]:max-h-[70vh] **:data-[slot=table-container]:overflow-auto">
      {isFetching && !isLoading && (
        <div className="absolute inset-x-0 top-0 z-20 h-0.5 animate-pulse bg-primary" role="progressbar" aria-label={translate("Refreshing")} />
      )}
      {failed ? (
        // In the rows' place, under the toolbar: the tabs, search and
        // filters stay to hand, and the progress bar shows a retry running.
        <ErrorState
          bordered={false}
          title={translate(errorTitle)}
          description={typeof errorDescription === "string" ? translate(errorDescription) : errorDescription}
          onRetry={onRetry}
          className="py-10"
        />
      ) : (
        <Table
          aria-busy={isLoading || isFetching}
          className={cn(GAP_CLASS[gap], EDGE_CLASS, "[&_tbody_tr]:h-(--row-height)", fixed && cn("table-fixed", !kept && MIN_TABLE))}
          style={{ "--row-height": `${rowHeight}px`, minWidth } as React.CSSProperties}
        >
          {fixed && (
            <colgroup>
              {columns.map((column, index) => (
                <col key={column.id} style={{ width: colWidth(widths[index]) }} />
              ))}
            </colgroup>
          )}
          {/* The column heads (HEAD, each cell opaque), stuck to the top of the rows box. */}
          <TableHeader className="sticky top-0 z-10 [&_tr]:border-line">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-table-head hover:bg-table-head">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    // A list without a grid still keeps the checkbox and
                    // the menu narrow.
                    style={{ width: fixed ? undefined : widths[headerGroup.headers.indexOf(header)] }}
                    className={cn(
                      "h-auto",
                      HEAD,
                      headPadding === 12 ? "py-3" : headPadding === 9 ? "py-2.25" : "py-2",
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
                  <DataTableEmpty message={emptyMessage} canReset={canReset} onReset={onReset} action={emptyAction} />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, rowIndex) => {
                const href = rowHref?.(row.original);
                const cells = row.getVisibleCells();
                // A row with a page is a link (LINK_CELL), named by its first cell.
                const nameCell = href === undefined ? undefined : cells.find((cell) => !OWN_COLUMNS.has(cell.column.id));
                const nameId = `${tableId}-row-${rowIndex}`;
                const clickable = Boolean(onRowClick) && href === undefined;
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    // The list recipes' divider and the table's own row hover
                    // (bg-hover in light, the old cream/surface blend in dark);
                    // a highlight (a double charge's amber) comes last so it wins.
                    className={cn("group/row bg-surface", LIST_DIVIDER, "hover:bg-row-hover", clickable && "cursor-pointer", href !== undefined && LINK_FOCUS, rowClassName?.(row.original))}
                    onClick={clickable ? () => onRowClick?.(row.original) : undefined}
                    onKeyDown={
                      clickable
                        ? (event) => {
                            if (event.key === "Enter" && event.target === event.currentTarget) {
                              onRowClick?.(row.original);
                            }
                          }
                        : undefined
                    }
                    tabIndex={clickable ? 0 : undefined}
                  >
                    {cells.map((cell) => {
                      const covered = href !== undefined && !OWN_COLUMNS.has(cell.column.id);
                      const naming = cell === nameCell;
                      return (
                        <TableCell
                          key={cell.id}
                          id={naming ? nameId : undefined}
                          className={cn(
                            "py-2 text-body text-ink",
                            covered && LINK_CELL,
                            cell.column.columnDef.meta?.align === "right" && "text-right",
                            cell.column.columnDef.meta?.cellClassName,
                            getPinnedClassName(cell.column),
                          )}
                        >
                          {href !== undefined &&
                            covered &&
                            (naming ? (
                              <Link href={href} aria-labelledby={nameId} data-slot="table-row-link" className={ROW_LINK} />
                            ) : (
                              <Link href={href} tabIndex={-1} aria-hidden="true" prefetch={false} className={ROW_LINK} />
                            ))}
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default DataTableContent;
