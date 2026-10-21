import { cn } from "@/lib/utils";
import EmptyState from "../EmptyState";
import type { Tone } from "../tones";

interface ListEmptyProps {
  title: React.ReactNode;
  // With an icon it is the full empty state (icon, sentence, action);
  // without, a single centred line ("Nothing here.").
  icon?: React.ReactNode;
  tone?: Tone | "white";
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  // Classes for the row itself: "col-span-full" in a table laid out as one
  // grid with subgrid rows, so the empty line spans every column.
  rowClassName?: string;
}

// What a list shows with no rows, kept inside the table as one row and cell
// so the list's structure stays whole.
const ListEmpty = ({ title, icon, tone, description, action, className, rowClassName }: ListEmptyProps) => (
  <div role="row" data-slot="list-empty" className={rowClassName}>
    <div role="cell">
      {icon ? (
        <EmptyState bordered={false} icon={icon} tone={tone} title={title} description={description} action={action} className={className} />
      ) : (
        <p className={cn("px-6 py-10 text-center text-body text-ink-muted", className)}>{title}</p>
      )}
    </div>
  </div>
);

export default ListEmpty;
