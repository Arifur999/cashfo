"use client";

import Button from "@/components/smartly/Button";
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

// The smartly secondary button at the row's 32px; a destructive one in the
// person page's red outline.
// The boards' row pills: 32px, 10px in, 12.5px; a red one in #B91C1C on a #FCA5A5 line.
const BUTTON = "h-8 px-2.5 text-[12.5px]";
const DANGER = "border-danger-line-strong text-danger-ink hover:bg-expense-soft";

// The row's actions as the design's small buttons (View, Reset data): the
// safe ones first, the destructive ones outlined in red. In "split" mode
// only View is a button and the rest stay behind the "..." menu. A click
// never reaches the row's own onRowClick.
const DataTableInlineActions = <TData,>({ row, actions }: DataTableInlineActionsProps<TData>) => {
  const { translate } = useLocale();
  // Whose row a button acts on, for a screen reader's list of buttons.
  const name = actions.rowLabel?.(row);
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
        <Button
          key={label}
          variant="secondary"
          size="sm"
          className={cn(BUTTON, destructive && DANGER)}
          aria-label={name ? translate("{action} for {name}", { action: translate(label), name }) : undefined}
          onClick={() => onClick(row)}
        >
          {translate(label)}
        </Button>
      ))}
      {split && <DataTableRowActions row={row} actions={{ ...actions, onView: undefined }} variant={actions.menuStyle === "action" ? "action" : "outline"} />}
    </div>
  );
};

export default DataTableInlineActions;
