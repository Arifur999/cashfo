import { cn } from "@/lib/utils";
import Eyebrow from "./Eyebrow";
import type { Tone } from "./tones";

interface PageHeaderProps {
  // The pillar line above the title ("Money", "Habits", a date on Home).
  // design-v4 draws none over its page titles (the top bar's breadcrumb
  // says where you are), so only the "display" size shows it.
  eyebrow?: React.ReactNode;
  tone?: Tone;
  title: React.ReactNode;
  description?: React.ReactNode;
  // Most boards set the description on a normal line (the type scale's own);
  // the Books, Income sources and Insights boards on a 20px one.
  looseDescription?: boolean;
  // Leave the description to wider screens (the phone boards drop it).
  hideDescriptionOnPhone?: boolean;
  // Right-aligned page actions; they drop under the title on phones.
  actions?: React.ReactNode;
  // Leave the actions to the floating button on phones (Home).
  hideActionsOnPhone?: boolean;
  // "h1" is design-v4's page title (24px semibold) every page uses;
  // "display" the old 36px one, kept for a page that still asks for it.
  size?: "h1" | "display";
  className?: string;
}

// The design-v4 page header: the 24px semibold title, the 14px muted line
// under it 4px down, the actions (40px pills, 10px apart) on the right,
// lined up with the bottom of the text.
const PageHeader = ({ eyebrow, tone = "money", title, description, looseDescription = false, hideDescriptionOnPhone = false, actions, hideActionsOnPhone = false, size = "h1", className }: PageHeaderProps) => (
  <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
    <div className={cn("flex min-w-0 flex-col", size === "display" ? "gap-1 md:gap-2" : "gap-1")}>
      {eyebrow && size === "display" && <Eyebrow tone={tone}>{eyebrow}</Eyebrow>}
      <h1 className={cn("text-ink", size === "display" ? "text-h1 font-extrabold md:text-display" : "text-page-title")}>{title}</h1>
      {description && <p className={cn("text-ink-muted", size === "display" ? "text-body-lg" : "text-body", looseDescription && "leading-5", hideDescriptionOnPhone && "max-md:hidden")}>{description}</p>}
    </div>
    {actions && <div className={cn("flex shrink-0 flex-wrap items-center gap-2.5", hideActionsOnPhone && "hidden md:flex")}>{actions}</div>}
  </div>
);

export default PageHeader;
