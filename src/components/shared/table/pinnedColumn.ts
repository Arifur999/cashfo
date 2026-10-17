import type { Column } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

// Sticky styling for pinned columns (select pinned left, actions pinned
// right), so the row's controls stay reachable while a wide table scrolls
// sideways. A sticky cell must be opaque to cover what scrolls underneath
// it, so it takes the row's own colour: rows are opaque (the surface, the
// opaque row-hover, or a highlight such as a double charge's amber).
export const getPinnedClassName = <TData,>(column: Column<TData, unknown>, isHeader = false) => {
  const pinned = column.getIsPinned();
  if (!pinned) {
    return undefined;
  }

  return cn(
    "sticky z-[1]",
    isHeader ? "bg-cream" : "bg-inherit",
    pinned === "left" ? "left-0" : "right-0",
  );
};
