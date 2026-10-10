import type { Column } from "@tanstack/react-table";

// Plain-text name of a column, for menus and CSV headers: meta.label, else a
// string header, else the column id.
export const getColumnLabel = <TData,>(column: Column<TData, unknown>): string => {
  const header = column.columnDef.header;
  return column.columnDef.meta?.label ?? (typeof header === "string" ? header : column.id);
};
