import { cn } from "@/lib/utils";
import IconTile from "./IconTile";
import type { Tone } from "./tones";

interface StatePanelProps {
  icon: React.ReactNode;
  tone?: Tone | "white";
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  // Empty states sit on the fresh cream→mint wash; errors on plain white.
  background?: "fresh" | "plain";
  // Draws the card border around it; off when it fills a card already.
  bordered?: boolean;
  className?: string;
}

// One sentence and one action, centred: how every empty list, failed load
// and finished flow looks.
const StatePanel = ({ icon, tone = "white", title, description, action, background = "plain", bordered = true, className }: StatePanelProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-3 p-6 text-center",
      background === "fresh" && "bg-fresh",
      bordered && "rounded-lg border border-line bg-surface",
      bordered && background === "fresh" && "bg-fresh",
      className,
    )}
  >
    <IconTile tone={tone} size={48}>
      {icon}
    </IconTile>
    <p className="text-title font-bold text-ink">{title}</p>
    {description && <p className="max-w-sm text-body text-ink-muted">{description}</p>}
    {action && <div className="mt-1 flex flex-wrap items-center justify-center gap-3">{action}</div>}
  </div>
);

export default StatePanel;
