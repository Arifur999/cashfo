"use client";

import type { Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { ELLIPSIS_JUMP, getPageWindow } from "@/lib/table/pageWindow";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import ShowingRange from "./ShowingRange";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  totalRows: number;
}

const PAGE_BUTTON = "flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-small font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

// The design's list footer: "Showing 1–10 of 1,284" on the left, the page
// numbers on the right.
const DataTablePagination = <TData,>({ table, totalRows }: DataTablePaginationProps<TData>) => {
  const { translate } = useLocale();
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = Math.max(table.getPageCount(), 1);
  const currentPage = pageIndex + 1;
  const goToPage = (page: number) => table.setPageIndex(Math.min(Math.max(page, 1), pageCount) - 1);
  const first = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const last = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div className="flex flex-col gap-3 border-t border-line px-5 py-3 text-small text-ink-muted sm:flex-row sm:items-center sm:justify-between">
      <p>
        <ShowingRange first={first} last={last} total={totalRows} />
      </p>

      <nav aria-label={translate("Pagination")} className="flex items-center gap-1">
        <button type="button" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label={translate("Previous page")} className={cn(PAGE_BUTTON, "border-line bg-surface text-ink-2")}>
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>

        {getPageWindow(currentPage, pageCount).map((item) =>
          typeof item === "number" ? (
            <button
              key={item}
              type="button"
              aria-label={translate("Page {page}", { page: item })}
              aria-current={item === currentPage ? "page" : undefined}
              onClick={() => goToPage(item)}
              className={cn(PAGE_BUTTON, item === currentPage ? "border-forest bg-forest text-white dark:border-emerald dark:bg-emerald dark:text-on-action" : "border-line bg-surface text-ink-2 hover:bg-cream")}
            >
              {item}
            </button>
          ) : (
            <button
              key={item}
              type="button"
              aria-label={translate(item === "ellipsis-start" ? "Earlier pages" : "Later pages")}
              onClick={() => goToPage(item === "ellipsis-start" ? currentPage - ELLIPSIS_JUMP : currentPage + ELLIPSIS_JUMP)}
              className={cn(PAGE_BUTTON, "border-transparent text-ink-muted hover:bg-cream")}
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
          ),
        )}

        <button type="button" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label={translate("Next page")} className={cn(PAGE_BUTTON, "border-line bg-surface text-ink-2")}>
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
};

export default DataTablePagination;
