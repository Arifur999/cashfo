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
  // The figures are being read again (another period): set back until then.
  busy?: boolean;
  className?: string;
}

// Four figures in one card, divided by hairlines: an account's opening, in,
// out and closing; what customers owe and what you owe. Two by two until
// the content is wide enough (xl) for four lakh-sized figures side by side;
// a figure too long for its cell wraps rather than being cut off.
export function StatStrip({ stats, busy = false, className }: StatStripProps) {
  return (
    <Card padding="none" aria-busy={busy || undefined} className={cn("grid grid-cols-2 transition-opacity xl:grid-cols-4", busy && "opacity-60", className)}>
      {stats.map((stat, index) => (
        <div key={index} className={cn("flex min-w-0 flex-col gap-1 px-4 py-3 lg:px-5 lg:py-4", index % 2 === 1 && "border-l border-line", index >= 2 && "border-t border-line xl:border-t-0", index > 0 && "xl:border-l xl:border-line")}>
          <span className="text-small text-ink-muted">{stat.label}</span>
          <span className={cn("text-h3 tabular-nums wrap-anywhere md:text-h2", TONE[stat.tone ?? "neutral"])}>{stat.value}</span>
          {stat.note && <span className="text-caption text-ink-muted">{stat.note}</span>}
        </div>
      ))}
    </Card>
  );
}
