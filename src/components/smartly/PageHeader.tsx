import { cn } from "@/lib/utils";
import Eyebrow from "./Eyebrow";
import type { Tone } from "./tones";

interface PageHeaderProps {
  // The pillar line above the title ("Money", "Habits", a date on Home).
  eyebrow?: React.ReactNode;
  tone?: Tone;
  title: React.ReactNode;
  description?: React.ReactNode;
  // Leave the description to wider screens (the phone boards drop it).
  hideDescriptionOnPhone?: boolean;
  // Right-aligned page actions; they drop under the title on phones.
  actions?: React.ReactNode;
  // Leave the actions to the floating button on phones (Home).
  hideActionsOnPhone?: boolean;
  // Home uses the 36px display title; every other page the 28px h1.
  size?: "h1" | "display";
  className?: string;
}

// Phone boards set every page title in extra bold; wider ones in bold.
const PageHeader = ({ eyebrow, tone = "money", title, description, hideDescriptionOnPhone = false, actions, hideActionsOnPhone = false, size = "h1", className }: PageHeaderProps) => (
  <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
    <div className={cn("flex min-w-0 flex-col", size === "display" ? "gap-1 md:gap-2" : "gap-1")}>
      {eyebrow && <Eyebrow tone={tone}>{eyebrow}</Eyebrow>}
      <h1 className={cn("font-extrabold text-ink", size === "display" ? "text-h1 md:text-display" : "text-h1 md:font-bold")}>{title}</h1>
      {description && <p className={cn("text-ink-muted", size === "display" ? "text-body-lg" : "text-body", hideDescriptionOnPhone && "max-md:hidden")}>{description}</p>}
    </div>
    {actions && <div className={cn("flex shrink-0 flex-wrap items-center gap-3", hideActionsOnPhone && "hidden md:flex")}>{actions}</div>}
  </div>
);

export default PageHeader;
