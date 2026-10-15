import { cn } from "@/lib/utils";
import { paletteFor } from "./bookPalette";

interface CoverProps {
  title: string;
  author?: string;
  color: string;
  // spine: the 26×38 block on a shelf row; card: the 72×106 preview in the
  // drawer; large: the 112×164 cover on the now-reading card.
  size?: "spine" | "card" | "large";
  className?: string;
}

const BODY = {
  card: "h-26.5 w-18 rounded-[3px_9px_9px_3px] py-2 pr-2 pl-3 [&>span:first-child]:text-small [&>span:last-child]:text-[11px]",
  large: "h-41 w-28 rounded-[4px_12px_12px_4px] pt-4 pr-3 pb-3 pl-4 [&>span:first-child]:text-body-lg [&>span:last-child]:text-caption",
} as const;

// A book drawn in CSS: a darker spine down the left, the cover colour from
// its palette and the title in the cover's own ink, so every book looks like
// itself with nothing to upload.
export function Cover({ title, author, color, size = "large", className }: CoverProps) {
  const palette = paletteFor(color);
  if (size === "spine") {
    return <span aria-hidden="true" className={cn("block h-9.5 w-6.5 shrink-0 rounded-[2px_5px_5px_2px] shadow-[inset_3px_0_0_rgba(0,0,0,0.18)]", className)} style={{ background: palette.from }} />;
  }
  const spine = size === "card" ? 6 : 8;
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 flex-col justify-between shadow-[0_6px_14px_rgba(0,0,0,0.25)]", BODY[size], className)} style={{ background: `linear-gradient(90deg, ${palette.to} 0 ${spine}px, ${palette.from} ${spine}px 100%)`, color: palette.ink }}>
      <span className="line-clamp-4 font-bold leading-[1.2] break-words">{title}</span>
      <span className="line-clamp-2 font-semibold leading-tight break-words opacity-85">{author}</span>
    </span>
  );
}
