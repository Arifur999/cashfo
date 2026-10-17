"use client";

import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DataTableActions } from "./dataTable.types";

interface DataTableRowActionsProps<TData> {
  row: TData;
  actions: DataTableActions<TData>;
  // "outline" is the 32px bordered button the design draws beside an
  // inline action; "ghost" the bare dots at the end of a row.
  variant?: "ghost" | "outline";
}

// Order: View, Edit, extra actions, then everything destructive (extra
// destructive actions and Delete) behind a separator.
const DataTableRowActions = <TData,>({ row, actions, variant = "ghost" }: DataTableRowActionsProps<TData>) => {
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
        <Button
          variant={variant}
          size="icon-sm"
          className={variant === "outline" ? "rounded-md border-line-strong bg-surface text-ink hover:bg-cream data-[state=open]:bg-cream" : "data-[state=open]:bg-muted"}
          aria-label="Open row actions"
          // Keeps a row-level onRowClick from firing as well.
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onClick={(event) => event.stopPropagation()}>
        {actions.onView && (
          <DropdownMenuItem onClick={() => actions.onView?.(row)}>
            <Eye aria-hidden="true" /> View
          </DropdownMenuItem>
        )}
        {actions.onEdit && (
          <DropdownMenuItem onClick={() => actions.onEdit?.(row)}>
            <Pencil aria-hidden="true" /> Edit
          </DropdownMenuItem>
        )}
        {safeExtras.map(({ label, icon: Icon, onClick }) => (
          <DropdownMenuItem key={label} onClick={() => onClick(row)}>
            {Icon && <Icon aria-hidden="true" />} {label}
          </DropdownMenuItem>
        ))}
        {hasSafeItems && hasDestructiveItems && <DropdownMenuSeparator />}
        {destructiveExtras.map(({ label, icon: Icon, onClick }) => (
          <DropdownMenuItem key={label} variant="destructive" onClick={() => onClick(row)}>
            {Icon && <Icon aria-hidden="true" />} {label}
          </DropdownMenuItem>
        ))}
        {actions.onDelete && (
          <DropdownMenuItem variant="destructive" onClick={() => actions.onDelete?.(row)}>
            <Trash2 aria-hidden="true" /> Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DataTableRowActions;
