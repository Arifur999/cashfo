import { cn } from "@/lib/utils";

export interface DescriptionItem {
  label: string;
  value: React.ReactNode;
  // Stacked layout only: span the whole row (long text such as a reason).
  fullWidth?: boolean;
}

interface DescriptionListProps {
  items: DescriptionItem[];
  // "inline": label left, value right, one row each -- for narrow sidebars.
  // "stacked": label over value in a responsive grid -- for wide cards.
  layout?: "inline" | "stacked";
  className?: string;
}

// The label/value facts every detail page shows (ticket details, refund,
// audit entry, ...), so each card passes data instead of hand-writing a <dl>.
const DescriptionList = ({ items, layout = "inline", className }: DescriptionListProps) => {
  if (layout === "stacked") {
    return (
      <dl className={cn("grid gap-3 text-sm sm:grid-cols-3", className)}>
        {items.map((item) => (
          <div key={item.label} className={cn(item.fullWidth && "sm:col-span-3")}>
            <dt className="text-xs text-muted-foreground uppercase">{item.label}</dt>
            <dd className="mt-0.5 text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className={cn("divide-y text-sm", className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
          <dt className="shrink-0 text-muted-foreground">{item.label}</dt>
          <dd className="min-w-0 text-right text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
};

export default DescriptionList;
