import { cn } from "@/lib/utils";
import Eyebrow from "./Eyebrow";
import type { Tone } from "./tones";

interface SectionHeaderProps {
  eyebrow?: React.ReactNode;
  tone?: Tone;
  title: React.ReactNode;
  // A "See all" link or a button, on the right.
  aside?: React.ReactNode;
  // The id the section's aria-labelledby points at.
  id?: string;
  className?: string;
}

// A section's title inside a page: the pillar above, the h2, a link beside.
const SectionHeader = ({ eyebrow, tone = "money", title, aside, id, className }: SectionHeaderProps) => (
  <div className={cn("flex items-end justify-between gap-4", className)}>
    <div className="flex min-w-0 flex-col gap-1">
      {eyebrow && <Eyebrow tone={tone}>{eyebrow}</Eyebrow>}
      <h2 id={id} className="text-h3 text-ink md:text-h2">
        {title}
      </h2>
    </div>
    {aside && <div className="flex shrink-0 items-center gap-4">{aside}</div>}
  </div>
);

export default SectionHeader;
