"use client";

import type { Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ELLIPSIS_JUMP, getPageWindow } from "@/lib/table/pageWindow";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  totalRows: number;
}

const DataTablePagination = <TData,>({ table, totalRows }: DataTablePaginationProps<TData>) => {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = Math.max(table.getPageCount(), 1);
  const currentPage = pageIndex + 1;
  const goToPage = (page: number) => table.setPageIndex(Math.min(Math.max(page, 1), pageCount) - 1);

  return (
    <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Total {totalRows.toLocaleString()} item{totalRows === 1 ? "" : "s"}, {pageCount} page{pageCount === 1 ? "" : "s"}
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(value) => table.setPageSize(Number(value))}>
            <SelectTrigger size="sm" className="w-20" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <nav aria-label="Pagination" className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => goToPage(1)} disabled={!table.getCanPreviousPage()} aria-label="First page">
            <ChevronsLeft aria-hidden="true" />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page">
            <ChevronLeft aria-hidden="true" />
          </Button>

          {getPageWindow(currentPage, pageCount).map((item) =>
            typeof item === "number" ? (
              <Button
                key={item}
                variant={item === currentPage ? "default" : "ghost"}
                size="icon-sm"
                aria-label={`Page ${item}`}
                aria-current={item === currentPage ? "page" : undefined}
                onClick={() => goToPage(item)}
              >
                {item}
              </Button>
            ) : (
              <Button
                key={item}
                variant="ghost"
                size="icon-sm"
                aria-label={item === "ellipsis-start" ? `Back ${ELLIPSIS_JUMP} pages` : `Forward ${ELLIPSIS_JUMP} pages`}
                onClick={() => goToPage(item === "ellipsis-start" ? currentPage - ELLIPSIS_JUMP : currentPage + ELLIPSIS_JUMP)}
              >
                <MoreHorizontal aria-hidden="true" />
              </Button>
            ),
          )}

          <Button variant="outline" size="icon-sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page">
            <ChevronRight aria-hidden="true" />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => goToPage(pageCount)} disabled={!table.getCanNextPage()} aria-label="Last page">
            <ChevronsRight aria-hidden="true" />
          </Button>
        </nav>
      </div>
    </div>
  );
};

export default DataTablePagination;
