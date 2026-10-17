import Card from "@/components/smartly/Card";
import { cn } from "@/lib/utils";

export interface Stat {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: "neutral" | "income" | "expense" | "warning";
  // A smaller line under the figure.
  note?: React.ReactNode;
}

const TONE = { neutral: "text-ink", income: "text-income", expense: "text-expense", warning: "text-warning" } as const;

interface StatStripProps {
  stats: Stat[];
  className?: string;
}

// Four figures side by side in one card, divided by hairlines: an account's
// opening, in, out and closing; what customers owe and what you owe.
export function StatStrip({ stats, className }: StatStripProps) {
  return (
    <Card padding="none" className={cn("grid grid-cols-2 lg:grid-cols-4", className)}>
      {stats.map((stat, index) => (
        <div key={index} className={cn("flex min-w-0 flex-col gap-1 px-5 py-4", index % 2 === 1 && "border-l border-line", index >= 2 && "border-t border-line lg:border-t-0", index > 0 && "lg:border-l lg:border-line")}>
          <span className="text-small text-ink-muted">{stat.label}</span>
          <span className={cn("truncate text-h2 tabular-nums", TONE[stat.tone ?? "neutral"])}>{stat.value}</span>
          {stat.note && <span className="text-caption text-ink-muted">{stat.note}</span>}
        </div>
      ))}
    </Card>
  );
}
