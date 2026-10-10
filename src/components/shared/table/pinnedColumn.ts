import type { Column } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

// Sticky styling for pinned columns (select pinned left, actions pinned
// right), so the row's controls stay reachable while a wide table scrolls
// sideways. The background follows the row's hover/selected state, since a
// sticky cell must be opaque to cover what scrolls underneath it.
export const getPinnedClassName = <TData,>(column: Column<TData, unknown>, isHeader = false) => {
  const pinned = column.getIsPinned();
  if (!pinned) {
    return undefined;
  }

  return cn(
    "sticky z-[1] bg-card",
    !isHeader && "group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted",
    pinned === "left" ? "left-0 shadow-[inset_-1px_0_0_var(--border)]" : "right-0 shadow-[inset_1px_0_0_var(--border)]",
  );
};
