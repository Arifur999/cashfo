import { cn } from "@/lib/utils";
import { SkillIcon } from "./SkillIcon";
import { paletteFor } from "./skillPalette";

interface SkillTileProps {
  icon: string;
  color: string;
  size?: 30 | 40;
  className?: string;
}

// A skill's icon on a soft wash of its own colour. The colour comes in as
// CSS variables so the ink can flip to the lighter stop in dark mode.
export function SkillTile({ icon, color, size = 40, className }: SkillTileProps) {
  const palette = paletteFor(color);
  return (
    <span
      aria-hidden="true"
      className={cn("flex shrink-0 items-center justify-center rounded-md bg-(--sk-ink)/12 text-(--sk-ink) dark:bg-(--sk-light)/16 dark:text-(--sk-light)", size === 40 ? "size-10 [&_svg]:size-5" : "size-7.5 [&_svg]:size-4", className)}
      style={{ "--sk-ink": palette.to, "--sk-light": palette.from } as React.CSSProperties}
    >
      <SkillIcon icon={icon} />
    </span>
  );
}
