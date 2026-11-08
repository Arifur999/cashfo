"use client";

import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Button from "@/components/smartly/Button";
import { iconActionClass } from "@/components/smartly/IconAction";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { DataTableActions } from "./dataTable.types";

interface DataTableRowActionsProps<TData> {
  row: TData;
  actions: DataTableActions<TData>;
  // "outline" is the 32px bordered button the design draws beside an
  // inline action; "ghost" the bare dots at the end of a row; "act" the v16
  // boards' 34px square row action (.sm-act).
  variant?: "ghost" | "outline" | "act";
  // "row" is the actions column's 32px; "sm" smartly's 36px icon button,
  // for a cell that sets it beside its own size-sm buttons (the admin
  // team's Edit).
  size?: "row" | "sm";
}

// Order: View, Edit, extra actions, then everything destructive (extra
// destructive actions and Delete) behind a separator.
const DataTableRowActions = <TData,>({ row, actions, variant = "ghost", size = "row" }: DataTableRowActionsProps<TData>) => {
  const { translate } = useLocale();
  const name = actions.rowLabel?.(row);
  const visibleExtras = (actions.extra ?? []).filter((action) => !action.hidden?.(row));
  const safeExtras = visibleExtras.filter((action) => !action.destructive);
  const destructiveExtras = visibleExtras.filter((action) => action.destructive);
  const hasSafeItems = Boolean(actions.onView || actions.onEdit || safeExtras.length > 0);
  const hasDestructiveItems = Boolean(actions.onDelete || destructiveExtras.length > 0);

  if (!hasSafeItems && !hasDestructiveItems) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "act" ? (
          <button
            type="button"
            className={cn(iconActionClass(), "data-[state=open]:border-mint-200 data-[state=open]:bg-emerald-soft data-[state=open]:text-emerald")}
            aria-label={name ? translate("Open row actions for {name}", { name }) : translate("Open row actions")}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal aria-hidden="true" />
          </button>
        ) : (
          <Button
            // The bordered one is the smartly secondary button beside the
            // inline ones; both stay 32px, as the actions column is drawn,
            // unless the cell asks for smartly's own 36px.
            variant={variant === "outline" ? "secondary" : "ghost"}
            size="icon-sm"
            className={cn(size === "row" && "size-8", "data-[state=open]:bg-surface-sunken")}
            aria-label={name ? translate("Open row actions for {name}", { name }) : translate("Open row actions")}
            // Keeps a row-level onRowClick from firing as well.
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onClick={(event) => event.stopPropagation()}>
        {actions.onView && (
          <DropdownMenuItem onClick={() => actions.onView?.(row)}>
            <Eye aria-hidden="true" /> {translate("View")}
          </DropdownMenuItem>
        )}
        {actions.onEdit && (
          <DropdownMenuItem onClick={() => actions.onEdit?.(row)}>
            <Pencil aria-hidden="true" /> {translate("Edit")}
          </DropdownMenuItem>
        )}
        {safeExtras.map(({ label, icon: Icon, onClick }) => (
          <DropdownMenuItem key={label} onClick={() => onClick(row)}>
            {Icon && <Icon aria-hidden="true" />} {translate(label)}
          </DropdownMenuItem>
        ))}
        {hasSafeItems && hasDestructiveItems && <DropdownMenuSeparator />}
        {destructiveExtras.map(({ label, icon: Icon, onClick }) => (
          <DropdownMenuItem key={label} variant="destructive" onClick={() => onClick(row)}>
            {Icon && <Icon aria-hidden="true" />} {translate(label)}
          </DropdownMenuItem>
        ))}
        {actions.onDelete && (
          <DropdownMenuItem variant="destructive" onClick={() => actions.onDelete?.(row)}>
            <Trash2 aria-hidden="true" /> {translate("Delete")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DataTableRowActions;
