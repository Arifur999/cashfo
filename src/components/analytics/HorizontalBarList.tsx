import { EmptyChartState } from "./EmptyChartState";

interface BarItem {
  label: string;
  value: number;
  sublabel?: string;
}

interface HorizontalBarListProps {
  items: BarItem[];
  emptyMessage?: string;
}

export function HorizontalBarList({ items, emptyMessage }: HorizontalBarListProps) {
  if (items.length === 0) {
    return <EmptyChartState message={emptyMessage} />;
  }

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-36 shrink-0 truncate text-sm text-neutral-600">{item.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-brand-primary" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <span className="w-16 shrink-0 text-right text-xs text-neutral-500">
            {item.value}
            {item.sublabel ? ` ${item.sublabel}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
