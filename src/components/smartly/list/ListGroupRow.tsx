import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LIST_GROUP } from "./recipes";

interface ListGroupRowProps {
  label: React.ReactNode;
  // The group's figure on the right: a day's net, a count.
  aside?: React.ReactNode;
  // With onToggle the band is a button that opens and closes its rows.
  expanded?: boolean;
  onToggle?: () => void;
  // The id of the rows it opens and closes.
  controls?: string;
  className?: string;
}

// A 38px band heading a group of rows (Today, March, Assets). Wrap the band
// and its rows in a role="rowgroup" div; the row right under the band draws
// no divider, the band's own line is enough.
const ListGroupRow = ({ label, aside, expanded = false, onToggle, controls, className }: ListGroupRowProps) => (
  <div role="row" data-slot="list-group" className={cn("border-b border-divider", LIST_GROUP, onToggle && "px-0 md:px-0", className)}>
    {onToggle ? (
      <div role="cell">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={controls}
          onClick={onToggle}
          className="flex h-9.5 w-full items-center gap-2 px-4 text-left transition-colors hover:bg-surface-sunken focus-visible:-outline-offset-2 md:px-6"
        >
          <ChevronRight className={cn("size-4 shrink-0 text-ink-muted transition-transform motion-reduce:transition-none", expanded && "rotate-90")} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {aside && <span className="shrink-0 tabular-nums">{aside}</span>}
        </button>
      </div>
    ) : (
      <div role="cell" className="flex h-9.5 items-center justify-between gap-3">
        <span className="min-w-0 truncate">{label}</span>
        {aside && <span className="shrink-0 tabular-nums">{aside}</span>}
      </div>
    )}
  </div>
);

export default ListGroupRow;
