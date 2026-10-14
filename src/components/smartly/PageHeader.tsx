import { cn } from "@/lib/utils";
import Eyebrow from "./Eyebrow";
import type { Tone } from "./tones";

interface PageHeaderProps {
  // The pillar line above the title ("Money", "Habits", a date on Home).
  eyebrow?: React.ReactNode;
  tone?: Tone;
  title: React.ReactNode;
  description?: React.ReactNode;
  // Right-aligned page actions; they drop under the title on phones.
  actions?: React.ReactNode;
  // Home uses the 36px display title; every other page the 28px h1.
  size?: "h1" | "display";
  className?: string;
}

const PageHeader = ({ eyebrow, tone = "money", title, description, actions, size = "h1", className }: PageHeaderProps) => (
  <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
    <div className={cn("flex min-w-0 flex-col", size === "display" ? "gap-2" : "gap-1")}>
      {eyebrow && <Eyebrow tone={tone}>{eyebrow}</Eyebrow>}
      <h1 className={cn("text-ink", size === "display" ? "text-h1 md:text-display" : "text-h1")}>{title}</h1>
      {description && <p className={cn("text-ink-muted", size === "display" ? "text-body-lg" : "text-body")}>{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
  </div>
);

export default PageHeader;
