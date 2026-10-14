import { cn } from "@/lib/utils";
import { SOFT_TONE, type Tone } from "./tones";

const SIZES = {
  // Tile size → its icon size, radius and shape, as the design draws them.
  32: "size-8 rounded-md [&_svg]:size-4",
  36: "size-9 rounded-md [&_svg]:size-4.5",
  44: "size-11 rounded-full [&_svg]:size-5",
  48: "size-12 rounded-md [&_svg]:size-5.5",
  72: "size-18 rounded-xl [&_svg]:size-8.5",
} as const;

interface IconTileProps {
  tone?: Tone | "white";
  size?: keyof typeof SIZES;
  // A circle instead of the rounded square (category dots, confirm dialogs).
  round?: boolean;
  className?: string;
  children: React.ReactNode;
}

// The soft square behind an icon: a category, a feature, an empty state.
const IconTile = ({ tone = "money", size = 36, round = false, className, children }: IconTileProps) => (
  <span
    aria-hidden="true"
    className={cn(
      "inline-flex shrink-0 items-center justify-center [&_svg]:shrink-0",
      SIZES[size],
      tone === "white" ? "bg-surface text-emerald" : SOFT_TONE[tone],
      round && "rounded-full",
      className,
    )}
  >
    {children}
  </span>
);

export default IconTile;
