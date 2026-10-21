import type { Column } from "@tanstack/react-table";
import { withoutContext } from "@/lib/i18n/message";
import { toCsv } from "@/lib/table/csv";
import { getColumnLabel } from "./columnLabel";
import type { DataTableExportColumn } from "./dataTable.types";

// The CSV of some rows under the given columns: each column's label heads
// it, and each cell is the column's exportValue, else its accessor's value
// (what row.getValue would give). The CSV-only columns (exportColumns)
// follow, each under its own heading. The rows on screen and the rows
// fetched for an export go through here alike, so the two files can't
// differ.
export const tableCsv = <TData,>(
  columns: Column<TData, unknown>[],
  rows: { original: TData; index: number }[],
  extra: readonly DataTableExportColumn<TData>[] = [],
): string =>
  toCsv(
    [...columns.map((column) => getColumnLabel(column)), ...extra.map((column) => withoutContext(column.label))],
    rows.map(({ original, index }) => [
      ...columns.map((column) => {
        const exportValue = column.columnDef.meta?.exportValue;
        return exportValue ? exportValue(original) : column.accessorFn?.(original, index);
      }),
      ...extra.map((column) => column.value(original)),
    ]),
  );
