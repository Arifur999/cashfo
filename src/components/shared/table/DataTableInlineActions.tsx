"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import DataTableRowActions from "./DataTableRowActions";
import type { DataTableActions } from "./dataTable.types";

interface DataTableInlineActionsProps<TData> {
  row: TData;
  actions: DataTableActions<TData>;
}

interface InlineButton<TData> {
  label: string;
  onClick: (row: TData) => void;
  destructive?: boolean;
}

const BUTTON = "h-8 rounded-md border bg-surface px-3 text-small font-semibold";
const SAFE = "border-line-strong text-ink hover:bg-cream";
const DANGER = "border-expense/40 text-expense hover:bg-expense-soft";

// The row's actions as the design's small buttons (View, Reset data): the
// safe ones first, the destructive ones outlined in red. In "split" mode
// only View is a button and the rest stay behind the "..." menu. A click
// never reaches the row's own onRowClick.
const DataTableInlineActions = <TData,>({ row, actions }: DataTableInlineActionsProps<TData>) => {
  const { translate } = useLocale();
  const split = actions.display === "split";
  const extras = (actions.extra ?? []).filter((action) => !action.hidden?.(row));
  const buttons: InlineButton<TData>[] = [];
  if (actions.onView) buttons.push({ label: actions.viewLabel ?? "View", onClick: actions.onView });
  if (!split) {
    if (actions.onEdit) buttons.push({ label: "Edit", onClick: actions.onEdit });
    buttons.push(...extras.filter((action) => !action.destructive), ...extras.filter((action) => action.destructive));
    if (actions.onDelete) buttons.push({ label: "Delete", onClick: actions.onDelete, destructive: true });
  }

  if (buttons.length === 0 && !split) {
    return null;
  }

  return (
    <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
      {buttons.map(({ label, onClick, destructive }) => (
        <Button key={label} type="button" variant="outline" size="sm" className={cn(BUTTON, destructive ? DANGER : SAFE)} onClick={() => onClick(row)}>
          {translate(label)}
        </Button>
      ))}
      {split && <DataTableRowActions row={row} actions={{ ...actions, onView: undefined }} variant="outline" />}
    </div>
  );
};

export default DataTableInlineActions;
