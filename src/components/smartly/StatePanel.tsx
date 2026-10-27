import { cn } from "@/lib/utils";
import IconTile from "./IconTile";
import type { Tone } from "./tones";

interface StatePanelProps {
  icon: React.ReactNode;
  tone?: Tone | "white";
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  // design-v4 draws every state on plain white; "fresh" is the old
  // page→mint wash, for a page that still asks for it.
  background?: "fresh" | "plain";
  // Draws the card border around it; off when it fills a card already.
  bordered?: boolean;
  className?: string;
}

// One sentence and one action, centred: how every empty list, failed load
// and finished flow looks (design-v4 LedgerEmpty: the 56px tile with 14px
// corners, the 18px title, the 14px muted line, the action under them; a
// 16px title inside a card).
const StatePanel = ({ icon, tone = "white", title, description, action, background = "plain", bordered = true, className }: StatePanelProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-2.5 p-8 text-center",
      background === "fresh" && "bg-fresh",
      bordered && "rounded-card border border-line-card bg-surface shadow-card",
      bordered && background === "fresh" && "bg-fresh",
      className,
    )}
  >
    {/* The old white tile was drawn for the wash; on white it takes the
        primary's tint. */}
    <IconTile tone={tone === "white" ? "money" : tone} size={56} className="mb-1.5">
      {icon}
    </IconTile>
    <p className={cn("text-ink", bordered ? "text-h3" : "text-title")}>{title}</p>
    {description && <p className="max-w-115 text-body leading-[1.55] text-ink-muted">{description}</p>}
    {action && <div className="mt-2 flex flex-wrap items-center justify-center gap-2.5">{action}</div>}
  </div>
);

export default StatePanel;
