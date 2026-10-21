import Link from "next/link";
import { cn } from "@/lib/utils";
import { CELL_ALIGN, type CellAlign, LIST_DIVIDER, LIST_HOVER, LIST_INSET, ROW_HEIGHT, type RowDensity } from "./recipes";

interface ListRowProps extends React.ComponentProps<"div"> {
  // The same md: grid template as the ListHead. Below md the row is a
  // two-column grid (main text, figure) unless className says otherwise.
  columns?: string;
  density?: RowDensity;
  // A voided or cancelled record: still listed, set back.
  muted?: boolean;
  selected?: boolean;
  // For the pointer only. A row is no control to Tab or a screen reader
  // (only a grid's rows can be), so its first cell still needs a real link
  // or button doing the same thing. A ListRowButton is both at once and
  // needs no onClick.
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

// A row whose ListRowLink or ListRowButton is stretched over it: the hover
// and the focus ring belong to the whole row. The ring is drawn inset, so
// the card's clipped edge never cuts it.
const TARGET_HOVER = "has-[[data-slot=list-row-link],[data-slot=list-row-button]]:hover:bg-hover";
const TARGET_FOCUS = [
  "has-[[data-slot=list-row-link]:focus-visible,[data-slot=list-row-button]:focus-visible]:outline-2",
  "has-[[data-slot=list-row-link]:focus-visible,[data-slot=list-row-button]:focus-visible]:-outline-offset-2",
  "has-[[data-slot=list-row-link]:focus-visible,[data-slot=list-row-button]:focus-visible]:outline-(--focus-ring)",
].join(" ");

// Clicks inside an onClick row that are not the row's: a link, a button, a
// field, a menu trigger, anywhere in the actions cell.
const OWN_CLICK = "a, button, input, select, textarea, label, summary, [role=button], [role=checkbox], [role=switch], [role=menuitem], [data-slot=list-row-actions]";

// One record. Rows divide with border-divider, the first one after the head
// or a band drawing none. It only lights up on hover when it goes
// somewhere: a ListRowLink or ListRowButton inside, or an onClick.
const ListRow = ({ columns, density = "regular", muted = false, selected = false, onClick, className, ...props }: ListRowProps) => (
  <div
    role="row"
    data-slot="list-row"
    // Only with an onClick: a Server Component can render a plain row, and
    // it can't hand a handler to the DOM.
    onClick={
      onClick
        ? (event) => {
            const target = event.target;
            // A portalled menu's item bubbles here through React, though it
            // sits outside the row in the page.
            if (!(target instanceof Element) || !event.currentTarget.contains(target)) return;
            const own = target.closest(OWN_CLICK);
            if (own && own !== event.currentTarget && event.currentTarget.contains(own)) return;
            onClick(event);
          }
        : undefined
    }
    className={cn(
      "relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3 text-body text-ink md:py-2",
      LIST_INSET,
      ROW_HEIGHT[density],
      LIST_DIVIDER,
      "[[data-slot=list-row]+&]:border-t",
      columns,
      TARGET_FOCUS,
      onClick && "cursor-pointer",
      !selected && (onClick ? LIST_HOVER : TARGET_HOVER),
      muted && "text-ink-2 [&_.text-ink]:text-ink-2 [&_.text-ink-2]:text-ink-muted",
      selected && "bg-mint-50",
      className,
    )}
    {...props}
  />
);

interface ListCellProps extends React.ComponentProps<"div"> {
  align?: CellAlign;
}

export const ListCell = ({ align = "start", className, ...props }: ListCellProps) => <div role="cell" className={cn("min-w-0", CELL_ALIGN[align], className)} {...props} />;

// The row's link, stretched over the whole row by its ::after, so the row is
// one big target while the text stays a real link (middle-click, copy link).
// The row draws its focus ring.
export const ListRowLink = ({ className, ...props }: React.ComponentProps<typeof Link>) => (
  <Link data-slot="list-row-link" className={cn("min-w-0 after:absolute after:inset-0 focus-visible:outline-none", className)} {...props} />
);

// The same for a row that opens something in place (a drawer, a dialog): a
// real button, so Tab and screen readers reach the row's action too.
export const ListRowButton = ({ className, ...props }: React.ComponentProps<"button">) => (
  <button
    type="button"
    data-slot="list-row-button"
    className={cn("min-w-0 cursor-pointer text-left after:absolute after:inset-0 focus-visible:outline-none", className)}
    {...props}
  />
);

// The row's buttons and menus, lifted above the stretched link so they stay
// clickable. A click anywhere in here never reaches the row's onClick.
export const ListRowActions = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div role="cell" data-slot="list-row-actions" className={cn("relative z-10 flex items-center justify-end gap-1", className)} {...props} />
);

export default ListRow;
