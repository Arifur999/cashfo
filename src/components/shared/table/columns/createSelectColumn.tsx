"use client";

import type { ColumnDef, Row, Table } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export const SELECT_COLUMN_ID = "select";

// The design's row checkbox: a 16px square, 4px corners, a 1.5px border.
const BOX = "rounded-[4px] border-[1.5px] border-line-strong bg-surface";

const SelectAllBox = <TData,>({ table }: { table: Table<TData> }) => {
  const { translate } = useLocale();
  return (
    <Checkbox
      className={BOX}
      checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
      onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))}
      aria-label={translate("Select all rows on this page")}
    />
  );
};

const SelectRowBox = <TData,>({ row }: { row: Row<TData> }) => {
  const { translate } = useLocale();
  return (
    <Checkbox
      className={BOX}
      checked={row.getIsSelected()}
      onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
      onClick={(event) => event.stopPropagation()}
      aria-label={translate("Select row")}
    />
  );
};

// Row-selection checkbox column. DataTable prepends it when
// enableRowSelection is set -- never add it to a columns file by hand.
export const createSelectColumn = <TData,>(): ColumnDef<TData> => ({
  id: SELECT_COLUMN_ID,
  header: ({ table }) => <SelectAllBox table={table} />,
  cell: ({ row }) => <SelectRowBox row={row} />,
  enableSorting: false,
  enableHiding: false,
  meta: { width: 20 },
});
