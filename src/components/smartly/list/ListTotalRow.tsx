import { cn } from "@/lib/utils";
import { LIST_TOTAL } from "./recipes";

interface ListTotalRowProps {
  label?: React.ReactNode;
  value?: React.ReactNode;
  // To line the figures up under their columns, give the head's columns
  // and the cells as children (ListCell) instead of label and value.
  columns?: string;
  children?: React.ReactNode;
  className?: string;
}

// The 52px totals row at the foot of a table, on the table-head band.
const ListTotalRow = ({ label, value, columns, children, className }: ListTotalRowProps) => (
  <div
    role="row"
    data-slot="list-total"
    className={cn(
      "min-h-13 items-center gap-x-4 border-t border-line py-2",
      LIST_TOTAL,
      children ? cn("grid grid-cols-[minmax(0,1fr)_auto]", columns) : "flex justify-between",
      className,
    )}
  >
    {children ?? (
      <>
        <span role="cell" className="min-w-0">
          {label}
        </span>
        <span role="cell" className="shrink-0 text-right tabular-nums">
          {value}
        </span>
      </>
    )}
  </div>
);

export default ListTotalRow;
