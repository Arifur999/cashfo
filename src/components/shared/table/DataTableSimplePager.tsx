"use client";

import type { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { DataTableSimplePager as SimplePagerConfig } from "./dataTable.types";

const BUTTON = "h-8 rounded-md border-line-strong bg-surface px-3 text-small font-semibold text-ink hover:bg-cream disabled:text-ink-muted disabled:opacity-100";

interface DataTableSimplePagerProps<TData> {
  table: Table<TData>;
  totalRows: number;
  pager: SimplePagerConfig;
}

// The footer of a time-ordered log, as the design draws the audit log: a
// summary on the left ("1,284 entries · newest first"), "Newer" and
// "Older" on the right.
const DataTableSimplePager = <TData,>({ table, totalRows, pager }: DataTableSimplePagerProps<TData>) => {
  const { translate } = useLocale();
  const { pageIndex, pageSize } = table.getState().pagination;
  const first = pageIndex * pageSize + 1;
  const last = Math.min((pageIndex + 1) * pageSize, totalRows);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-small text-ink-muted">
      <span>{pager.summary(totalRows, { first, last })}</span>
      <span className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className={BUTTON} disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
          {translate(pager.previous)}
        </Button>
        <Button type="button" variant="outline" size="sm" className={BUTTON} disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
          {translate(pager.next)}
        </Button>
      </span>
    </div>
  );
};

export default DataTableSimplePager;
