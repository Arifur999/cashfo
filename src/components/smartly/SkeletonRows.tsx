import { cn } from "@/lib/utils";

// The bar widths cycle so a stack of rows looks like real, varied text.
const WIDTHS = [
  [60, 35],
  [52, 40],
  [44, 45],
  [36, 50],
];

const bar = "block animate-pulse rounded-sm bg-[linear-gradient(90deg,var(--surface-sunken)_0%,var(--cream)_50%,var(--surface-sunken)_100%)]";

interface SkeletonRowsProps {
  rows?: number;
  // With the leading circle (a list of transactions, people) or without
  // (a list of plain lines).
  avatar?: boolean;
  className?: string;
}

// Placeholder rows for a list that usually loads in under a second.
const SkeletonRows = ({ rows = 4, avatar = true, className }: SkeletonRowsProps) => (
  <div role="status" aria-label="Loading" className={cn("flex flex-col", className)}>
    {Array.from({ length: rows }, (_, index) => {
      const [title, meta] = WIDTHS[index % WIDTHS.length];
      return (
        <div
          key={index}
          className={cn("grid items-center gap-3 px-5 py-4", avatar ? "grid-cols-[36px_minmax(0,1fr)_90px]" : "grid-cols-[minmax(0,1fr)_90px]", index > 0 && "border-t border-surface-sunken")}
        >
          {avatar && <span className="size-9 rounded-full bg-surface-sunken" />}
          <span className="flex flex-col gap-2">
            <span className={cn(bar, "h-2.5")} style={{ width: `${title}%` }} />
            <span className={cn(bar, "h-2")} style={{ width: `${meta}%` }} />
          </span>
          <span className={cn(bar, "h-2.5 w-22.5")} />
        </div>
      );
    })}
  </div>
);

export default SkeletonRows;
