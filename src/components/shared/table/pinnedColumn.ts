import type { Column } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

// Sticky styling for pinned columns (select pinned left, actions pinned
// right), so the row's controls stay reachable while a wide table scrolls
// sideways. The background follows the row's hover/selected state, since a
// sticky cell must be opaque to cover what scrolls underneath it -- the
// hover is the row's cream/60 mixed onto the surface.
export const getPinnedClassName = <TData,>(column: Column<TData, unknown>, isHeader = false) => {
  const pinned = column.getIsPinned();
  if (!pinned) {
    return undefined;
  }

  return cn(
    "sticky z-[1]",
    isHeader ? "bg-cream" : "bg-surface group-hover/row:bg-[color-mix(in_oklab,var(--cream)_60%,var(--surface))] group-data-[state=selected]/row:bg-muted",
    pinned === "left" ? "left-0" : "right-0",
  );
};
