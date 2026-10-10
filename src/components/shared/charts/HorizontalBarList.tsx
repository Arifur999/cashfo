import { formatNumber } from "@/lib/number";

export interface BarListItem {
  label: string;
  value: number;
  // Unit shown after the value, e.g. "users".
  unit?: string;
}

interface HorizontalBarListProps {
  items: BarListItem[];
  emptyMessage?: string;
}

// Ranked bars relative to the largest value. Plain HTML (no chart library)
// keeps it light and readable by screen readers as a list of label/value
// pairs.
const HorizontalBarList = ({ items, emptyMessage = "No data for this period." }: HorizontalBarListProps) => {
  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3">
          <span className="w-36 shrink-0 truncate text-sm text-muted-foreground" title={item.label}>
            {item.label}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <span className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
            {formatNumber(item.value)}
            {item.unit ? ` ${item.unit}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
};

export default HorizontalBarList;
