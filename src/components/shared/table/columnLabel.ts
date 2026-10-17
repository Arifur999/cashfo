import type { Column } from "@tanstack/react-table";
import { withoutContext } from "@/lib/i18n/translate";

// Plain-text name of a column, for menus and CSV headers: meta.label, else a
// string header, else the column id. Menus translate it; a CSV keeps the
// English, without any "@@meaning" mark.
export const getColumnLabel = <TData,>(column: Column<TData, unknown>): string => {
  const header = column.columnDef.header;
  return withoutContext(column.columnDef.meta?.label ?? (typeof header === "string" ? header : column.id));
};
