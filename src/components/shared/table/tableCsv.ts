import type { Column } from "@tanstack/react-table";
import { toCsv } from "@/lib/table/csv";
import { getColumnLabel } from "./columnLabel";

// The CSV of some rows under the given columns: each column's label heads
// it, and each cell is the column's exportValue, else its accessor's value
// (what row.getValue would give). The rows on screen and the rows fetched
// for an export go through here alike, so the two files can't differ.
export const tableCsv = <TData,>(columns: Column<TData, unknown>[], rows: { original: TData; index: number }[]): string =>
  toCsv(
    columns.map((column) => getColumnLabel(column)),
    rows.map(({ original, index }) =>
      columns.map((column) => {
        const exportValue = column.columnDef.meta?.exportValue;
        return exportValue ? exportValue(original) : column.accessorFn?.(original, index);
      }),
    ),
  );
