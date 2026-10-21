import type { Column } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

// Sticky styling for pinned columns (select pinned left, actions pinned
// right), so the row's controls stay reachable while a wide table scrolls
// sideways. A sticky cell must be opaque to cover what scrolls underneath
// it: a head takes the list recipes' head band (bg-table-head), a cell its
// row's own colour, and rows are opaque (the surface, bg-hover, or a
// highlight such as a double charge's amber).
export const getPinnedClassName = <TData,>(column: Column<TData, unknown>, isHeader = false) => {
  const pinned = column.getIsPinned();
  if (!pinned) {
    return undefined;
  }

  return cn(
    "sticky z-[1]",
    isHeader ? "bg-table-head" : "bg-inherit",
    pinned === "left" ? "left-0" : "right-0",
  );
};
