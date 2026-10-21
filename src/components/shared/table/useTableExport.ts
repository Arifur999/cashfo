"use client";

import type { Table } from "@tanstack/react-table";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useExportAction } from "@/components/shared/ExportAction";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { DataTableProps } from "./dataTable.types";
import { claimExport, collectAllRows, EXPORT_ROW_CAP } from "./exportAll";
import { exportRowsCsv, exportTableCsv } from "./exportTableCsv";

type ExportProps<TData> = Pick<DataTableProps<TData>, "exportFileName" | "exportAll" | "exportColumns" | "getRowId">;
type FetchPage<TData> = NonNullable<DataTableProps<TData>["exportAll"]>;

// A wait for the request limit shorter than this passes without a note, so
// the short waits between later pages don't flash one.
const NOTED_PAUSE_MS = 2_000;

// What the page header's Export downloads for a DataTable: the selected rows
// if any; else, for a server list with exportAll, every row that matches the
// filters (read a page at a time, up to 10,000); else every row it holds.
// The CSV-only columns (exportColumns) follow the table's own either way.
export function useTableExport<TData>(table: Table<TData>, { exportFileName, exportAll, exportColumns, getRowId }: ExportProps<TData>) {
  const { translate, locale } = useLocale();
  const count = (value: number) => formatCount(value, locale);
  // The export this list has under way. Leaving the page calls it off: no
  // page after it is read, and nothing is downloaded.
  const running = useRef<AbortController | null>(null);
  useEffect(() => () => running.current?.abort(), []);

  const exportEveryRow = async (fileName: string, fetchPage: FetchPage<TData>) => {
    // One export at a time: a second would share the minute's requests.
    const release = claimExport();
    if (!release) {
      toast.info(translate("An export is already running"));
      return;
    }
    const controller = new AbortController();
    running.current = controller;

    // The progress toast shows from the second page on (or from a wait
    // before the first), so a one-page export just downloads, as the
    // in-memory ones do.
    let toastId: string | number | undefined;
    let done = 0;
    let goal = 0;
    let note: string | undefined;
    const showProgress = () => {
      // Before the first page there is no count to give yet.
      const title = goal > 0 ? translate("Exporting {count} of {total} rows…", { count: count(done), total: count(goal) }) : translate("Exporting...");
      toastId = toast.loading(title, { id: toastId, description: note });
    };
    // Called off: its toast goes at once, and the next export needn't wait
    // for the request still out (the shared log already counts it).
    controller.signal.addEventListener("abort", () => {
      release();
      if (toastId !== undefined) toast.dismiss(toastId);
    });

    try {
      const { rows, total, capped, incomplete } = await collectAllRows(fetchPage, {
        getId: getRowId,
        signal: controller.signal,
        onProgress: (soFar, matched) => {
          done = soFar;
          goal = Math.min(matched, EXPORT_ROW_CAP);
          // A page came in, so any wait is over.
          note = undefined;
          showProgress();
        },
        // A long wait for the API's request limit is said, or the count
        // looks stuck.
        onPause: (ms) => {
          if (ms <= NOTED_PAUSE_MS) return;
          note = translate("Pausing up to a minute to stay within the server's request limit.");
          showProgress();
        },
      });
      exportRowsCsv(table, rows, fileName, exportColumns);
      const counts = { count: count(rows.length), total: count(total) };
      if (capped) {
        toast.warning(translate("Exported the first {count} of {total} rows. Narrow the filters to export the rest.", counts), { id: toastId, description: undefined });
      } else if (incomplete) {
        // The file has what was read; saying "every row" would be wrong.
        toast.warning(translate("Exported {count} of {total} rows. The list changed while exporting; export again to get the rest.", counts), {
          id: toastId,
          description: undefined,
        });
      } else if (toastId !== undefined) {
        toast.success(translate(rows.length === 1 ? "Exported {count} row" : "Exported {count} rows", { count: count(rows.length) }), { id: toastId, description: undefined });
      }
    } catch {
      // Called off: the toast has gone already.
      if (controller.signal.aborted) return;
      // Nothing is downloaded: half a list would pass for all of it.
      toast.error(translate("Couldn't export the rows. Try again."), { id: toastId, description: undefined });
    } finally {
      release();
      if (running.current === controller) running.current = null;
    }
  };

  useExportAction(
    exportFileName
      ? () => {
          if (exportAll && table.getSelectedRowModel().rows.length === 0) {
            return exportEveryRow(exportFileName, exportAll);
          }
          exportTableCsv(table, exportFileName, exportColumns);
        }
      : null,
  );
}
