"use client";

import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  // A number column's head sits on the right, like its cells.
  align?: "left" | "right";
  className?: string;
}

// DataTable renders every plain-string `header` through this, so a columns
// file just writes `header: "Amount"` and still gets sort + hide controls.
const DataTableColumnHeader = <TData, TValue>({ column, title, align = "left", className }: DataTableColumnHeaderProps<TData, TValue>) => {
  const canSort = column.getCanSort();
  const canHide = column.getCanHide();
  const right = align === "right";

  if (!canSort && !canHide) {
    return <div className={cn("text-caption font-medium", className)}>{title}</div>;
  }

  const sorted = column.getIsSorted();
  const SortIcon = sorted === "desc" ? ArrowDown : sorted === "asc" ? ArrowUp : ChevronsUpDown;

  return (
    <div className={cn("flex items-center", right && "justify-end", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 text-caption font-medium text-ink-muted hover:text-ink data-[state=open]:bg-surface-sunken", right ? "-mr-3" : "-ml-3")}
            aria-label={`${title} column options`}
          >
            {title}
            {canSort && <SortIcon className={cn("size-3.5", !sorted && "opacity-50")} aria-hidden="true" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {canSort && (
            <>
              <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
                <ArrowUp aria-hidden="true" /> Ascending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
                <ArrowDown aria-hidden="true" /> Descending
              </DropdownMenuItem>
              {sorted && (
                <DropdownMenuItem onClick={() => column.clearSorting()}>
                  <X aria-hidden="true" /> Clear sort
                </DropdownMenuItem>
              )}
            </>
          )}
          {canSort && canHide && <DropdownMenuSeparator />}
          {canHide && (
            <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
              <EyeOff aria-hidden="true" /> Hide column
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default DataTableColumnHeader;
