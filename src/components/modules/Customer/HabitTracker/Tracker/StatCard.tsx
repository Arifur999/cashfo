import Card from "@/components/smartly/Card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  // The figure's colour when it says good or bad ("text-income").
  tone?: string;
  className?: string;
  // Extra classes for the figure, e.g. a smaller size on phones.
  valueClassName?: string;
}

// One figure of a page's stat row (Daily habits, a Namaz month, Skills): the
// label, the 24px figure and the line under it, on the Habit Tracker's 12px
// card (design-v4). One card for every row, so the four can't drift apart.
export function StatCard({ label, value, sub, tone = "text-ink", className, valueClassName }: StatCardProps) {
  return (
    <Card padding="none" className={cn("flex min-w-0 flex-col gap-1 rounded-md px-4.5 py-3.5", className)}>
      <span className="text-small font-medium text-ink-muted">{label}</span>
      <span className={cn("text-[24px] leading-[normal] font-bold tracking-[-0.02em] tabular-nums", tone, valueClassName)}>{value}</span>
      {sub && <span className="text-caption text-ink-muted">{sub}</span>}
    </Card>
  );
}
