import T from "@/components/shared/T";
import { cn } from "@/lib/utils";
import { LIST_INSET } from "./recipes";

export type SummaryKind = "opening" | "brought-forward" | "closing" | "carried-forward";

// What each line is called unless the list words it itself.
const LABELS: Record<SummaryKind, string> = {
  opening: "Opening balance",
  "brought-forward": "Brought forward",
  closing: "Closing balance",
  "carried-forward": "Carried forward",
};

// The opening lines sit above the rows, the closing ones below.
const AT_END: Record<SummaryKind, boolean> = {
  opening: false,
  "brought-forward": false,
  closing: true,
  "carried-forward": true,
};

interface ListSummaryRowProps {
  kind: SummaryKind;
  label?: React.ReactNode;
  // The running balance, usually an AmountText.
  value?: React.ReactNode;
  // A short line under the label ("From the pages before").
  note?: React.ReactNode;
  // To put the figure under the Balance column, give the head's columns and
  // the cells as children instead.
  columns?: string;
  children?: React.ReactNode;
  className?: string;
}

// A statement's balance line: opening or brought forward above the rows,
// closing or carried forward below them, on the table-head band.
const ListSummaryRow = ({ kind, label, value, note, columns, children, className }: ListSummaryRowProps) => (
  <div
    role="row"
    data-slot="list-summary"
    className={cn(
      "min-h-11 items-center gap-x-4 border-divider bg-table-head py-2 text-small text-ink-2",
      LIST_INSET,
      AT_END[kind] ? "border-t" : "border-b",
      children ? cn("grid grid-cols-[minmax(0,1fr)_auto]", columns) : "flex justify-between",
      className,
    )}
  >
    {children ?? (
      <>
        <span role="cell" className="flex min-w-0 flex-col">
          <span className="font-semibold text-ink">{label ?? <T>{LABELS[kind]}</T>}</span>
          {note && <span className="text-caption text-ink-muted">{note}</span>}
        </span>
        <span role="cell" className="shrink-0 text-right font-semibold text-ink tabular-nums">
          {value}
        </span>
      </>
    )}
  </div>
);

export default ListSummaryRow;
