"use client";

import type { Table } from "@tanstack/react-table";
import ListFooter from "@/components/smartly/list/ListFooter";
import Pagination from "@/components/smartly/Pagination";
import { pageSizeOptions } from "./tablePaging";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  totalRows: number;
  // The list's own page size (initialPageSize, a server list's defaultLimit).
  defaultPageSize: number;
  // The list's card, brought back into view after a page change.
  focusTargetId?: string;
}

// The numbered footer of an admin list: the shared Pagination ("Showing
// 1–10 of 1,284", the pages, rows per page) on the table's own state. A
// server list's page and size live in the URL (useServerManagedDataTable
// takes them from table.setPageIndex / setPageSize), an in-memory list's in
// the table. One page shows the summary alone, as DataTableSimplePager does
// (Pagination keeps rows per page there while the list holds more rows than
// the smallest size). The footer keeps the admin board's 20px edges.
const DataTablePagination = <TData,>({ table, totalRows, defaultPageSize, focusTargetId }: DataTablePaginationProps<TData>) => {
  const { pageIndex, pageSize } = table.getState().pagination;

  return (
    <ListFooter className="px-4.5 md:px-4.5">
      <Pagination
        page={pageIndex + 1}
        totalPages={table.getPageCount()}
        total={totalRows}
        pageSize={pageSize}
        onPageChange={(page) => table.setPageIndex(page - 1)}
        pageSizes={pageSizeOptions(defaultPageSize)}
        // Keeps the top row in view: page 3 of 10s is page 1 of 25s.
        onPageSizeChange={(size) => table.setPageSize(size)}
        focusTargetId={focusTargetId}
      />
    </ListFooter>
  );
};

export default DataTablePagination;
