"use client";

import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  // A number column's head sits on the right, like its cells.
  align?: "left" | "right";
  className?: string;
}

// DataTable renders every plain-string `header` through this, so a columns
// file just writes `header: "Amount"` and a sortable column still gets its
// sort menu.
const DataTableColumnHeader = <TData, TValue>({ column, title, align = "left", className }: DataTableColumnHeaderProps<TData, TValue>) => {
  const { translate } = useLocale();
  // Headers are English keys like every other string.
  const label = translate(title);
  const canSort = column.getCanSort();
  const right = align === "right";

  if (!canSort) {
    return <div className={cn("text-caption font-medium", className)}>{label}</div>;
  }

  const sorted = column.getIsSorted();
  const SortIcon = sorted === "desc" ? ArrowDown : sorted === "asc" ? ArrowUp : ChevronsUpDown;
  // The design's headers are plain words: the arrows show once a column is
  // sorted, or while the pointer or focus is on a head that can be. A number
  // column draws them before its word, so the word stays over the figures.
  const sortIcon = (
    <SortIcon
      className={cn("size-3.5", !sorted && "opacity-0 transition-opacity group-hover/head:opacity-50 group-focus-visible/head:opacity-50")}
      aria-hidden="true"
    />
  );

  return (
    <div className={cn("flex items-center", right && "justify-end", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="group/head h-auto gap-1 rounded-sm p-0 text-caption font-medium text-ink-muted hover:bg-transparent hover:text-ink aria-expanded:bg-transparent data-[state=open]:text-ink"
          >
            {right && sortIcon}
            {label}
            {!right && sortIcon}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUp aria-hidden="true" /> {translate("Ascending")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDown aria-hidden="true" /> {translate("Descending")}
          </DropdownMenuItem>
          {sorted && (
            <DropdownMenuItem onClick={() => column.clearSorting()}>
              <X aria-hidden="true" /> {translate("Clear sort")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default DataTableColumnHeader;
