"use client";

import type { Table } from "@tanstack/react-table";
import ListFooter from "@/components/smartly/list/ListFooter";
import Pagination from "@/components/smartly/Pagination";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { clampPage, pageRange } from "@/lib/table/pageParams";
import type { DataTableSimplePager as SimplePagerConfig } from "./dataTable.types";

interface DataTableSimplePagerProps<TData> {
  table: Table<TData>;
  totalRows: number;
  pager: SimplePagerConfig;
  // The list's card, brought back into view after a page change.
  focusTargetId?: string;
}

// The footer of a time-ordered log, as the design draws the audit log: a
// summary on the left ("1,284 entries · newest first"), "Newer" and
// "Older" on the right -- the shared Pagination's simple variant. One page
// shows the summary alone.
const DataTableSimplePager = <TData,>({ table, totalRows, pager, focusTargetId }: DataTableSimplePagerProps<TData>) => {
  const { translate } = useLocale();
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  // A stale ?page=99 reads as the last page until the URL catches up.
  const page = clampPage(pageIndex + 1, pageCount);

  return (
    <ListFooter className="px-5 md:px-5">
      <Pagination
        variant="simple"
        page={page}
        totalPages={pageCount}
        total={totalRows}
        pageSize={pageSize}
        onPageChange={(next) => table.setPageIndex(next - 1)}
        labels={{ previous: translate(pager.previous), next: translate(pager.next) }}
        summary={pager.summary(totalRows, { ...pageRange(page, pageSize, totalRows), page, pageSize })}
        focusTargetId={focusTargetId}
      />
    </ListFooter>
  );
};

export default DataTableSimplePager;
