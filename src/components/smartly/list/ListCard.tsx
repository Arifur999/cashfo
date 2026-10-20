import { cn } from "@/lib/utils";
import Card from "../Card";

interface ListCardProps extends Omit<React.ComponentProps<"div">, "title"> {
  // The table's accessible name, already translated.
  label: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  // Filters, a period switch or a button, on the right of the title.
  actions?: React.ReactNode;
  // A header of the list's own, in place of title/description/actions.
  header?: React.ReactNode;
  // A ListFooter. It sits outside the table, so it never reads as a row.
  footer?: React.ReactNode;
  elevated?: boolean;
  // Classes for the table itself (a min-width with "overflow-x-auto", say;
  // a sideways-scrolling table can't keep a sticky head).
  tableClassName?: string;
  // The rows are being replaced: assistive tech waits for them.
  busy?: boolean;
}

// The card a list lives in: the optional title row, the table (div rows with
// table roles, laid out by CSS grid), then the footer. overflow-clip rounds
// the corners without making the card a scroll box, so a sticky ListHead
// still sticks to the page. An id given here is what Pagination's (or
// LoadMore's) focusTargetId points at: the card scrolls back into view, with
// a little room above it, and the table inside takes focus, since it has the
// role and the name. Its ring is drawn inset, where the clip can't cut it.
const ListCard = ({ label, title, description, actions, header, footer, elevated = true, tableClassName, busy = false, className, children, ...props }: ListCardProps) => (
  <Card padding="none" elevated={elevated} className={cn("scroll-mt-4 overflow-clip", className)} {...props}>
    {header ??
      ((title || description || actions) && (
        <div className="flex flex-col gap-3 border-b border-line px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          {(title || description) && (
            <div className="flex min-w-0 flex-col gap-0.5">
              {title && <h2 className="text-title text-ink">{title}</h2>}
              {description && <p className="text-small text-ink-muted">{description}</p>}
            </div>
          )}
          {actions && <div className="flex flex-wrap items-center gap-2 md:ml-auto">{actions}</div>}
        </div>
      ))}
    <div role="table" aria-label={label} aria-busy={busy || undefined} className={cn("focus-visible:-outline-offset-2", tableClassName)}>
      {children}
    </div>
    {footer}
  </Card>
);

export default ListCard;
