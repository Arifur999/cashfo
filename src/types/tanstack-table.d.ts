import "@tanstack/react-table";
import type { RowData } from "@tanstack/react-table";

// Extra per-column metadata the shared DataTable understands. Declared once
// here so every columns file gets type-checked `meta` without casting.
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TValue must stay to merge with the library's declaration.
  interface ColumnMeta<TData extends RowData, TValue> {
    // Plain-text name for the column-visibility menu and the CSV header when
    // `header` is a component rather than a string.
    label?: string;
    // Value written to the CSV export; defaults to the accessor value.
    exportValue?: (row: TData) => string | number | boolean | null | undefined;
    headerClassName?: string;
    cellClassName?: string;
    // Numbers sit on the right, head and cells alike.
    align?: "left" | "right";
  }
}
