import { cn } from "@/lib/utils";
import { CELL_ALIGN, type CellAlign, LIST_HEAD } from "./recipes";

interface ListHeadProps extends React.ComponentProps<"div"> {
  // The grid template the rows share, prefixed for md up:
  // "md:grid-cols-[minmax(0,1fr)_130px_120px]" (unprefixed with
  // showOnPhone, for a table that scrolls sideways instead).
  columns: string;
  // Stays at the top of the page while a long list scrolls under it, above
  // the rows' ListRowActions (z-10), so their buttons pass under it.
  sticky?: boolean;
  // Phones stack each row as a card, so the heads hide there unless asked.
  showOnPhone?: boolean;
}

// The column heads: a 40px table-head band with the line under it.
const ListHead = ({ columns, sticky = false, showOnPhone = false, className, ...props }: ListHeadProps) => (
  <div
    role="row"
    data-slot="list-head"
    className={cn(
      "h-10 items-center gap-x-4 border-b border-line",
      showOnPhone ? "grid" : "hidden md:grid",
      LIST_HEAD,
      columns,
      sticky && "sticky top-0 z-20",
      className,
    )}
    {...props}
  />
);

interface ListHeadCellProps extends React.ComponentProps<"div"> {
  align?: CellAlign;
}

// One column head. An actions column still gets one, with sr-only text.
export const ListHeadCell = ({ align = "start", className, ...props }: ListHeadCellProps) => (
  <div role="columnheader" className={cn("min-w-0 truncate", CELL_ALIGN[align], className)} {...props} />
);

export default ListHead;
