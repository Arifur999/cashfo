import { cn } from "@/lib/utils";
import Card from "./Card";
import IconTile from "./IconTile";
import type { Tone } from "./tones";

interface KpiTileProps {
  icon?: React.ReactNode;
  tone?: Tone;
  label: React.ReactNode;
  // The figure: an AmountText, or any node.
  value: React.ReactNode;
  // The line under the figure ("From 3 people", a progress bar).
  children?: React.ReactNode;
  className?: string;
}

// One figure with its icon, label and a note: the tiles on Home, Loans,
// Savings and the admin dashboard.
const KpiTile = ({ icon, tone = "money", label, value, children, className }: KpiTileProps) => (
  <Card className={cn("flex flex-col gap-3", className)}>
    <span className="flex items-center gap-3 text-small font-medium text-ink-muted">
      {icon && <IconTile tone={tone}>{icon}</IconTile>}
      {label}
    </span>
    {value}
    {children && <div className="flex flex-col gap-3 text-small text-ink-muted">{children}</div>}
  </Card>
);

export default KpiTile;
