"use client";

import type { Row } from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface DataTableTreeCellProps<TData> {
  row: Row<TData>;
  children: React.ReactNode;
}

// The first cell of a tree table (DataTable with getSubRows): indents the
// row by its depth and toggles its children.
const DataTableTreeCell = <TData,>({ row, children }: DataTableTreeCellProps<TData>) => {
  const { translate } = useLocale();
  const isExpanded = row.getIsExpanded();

  return (
    <div className="flex items-center gap-1.5" style={{ paddingLeft: `${row.depth * 1.5}rem` }}>
      {row.getCanExpand() ? (
        <button
          type="button"
          onClick={(event) => {
            // Never also trigger the row's own click handler.
            event.stopPropagation();
            row.toggleExpanded();
          }}
          aria-expanded={isExpanded}
          aria-label={translate(isExpanded ? "Collapse" : "Expand")}
          className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className={cn("size-4 transition-transform", isExpanded && "rotate-90")} aria-hidden="true" />
        </button>
      ) : (
        <span className="size-5 shrink-0" aria-hidden="true" />
      )}
      {children}
    </div>
  );
};

export default DataTableTreeCell;
