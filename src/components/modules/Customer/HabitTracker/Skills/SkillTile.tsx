import { paletteFor } from "./skillPalette";
import { SkillIcon } from "./SkillIcon";

// A skill's "cover": its icon on a coloured gradient tile, drawn in CSS. The
// width comes from className (e.g. "w-28"); the tile stays square.
export function SkillTile({ icon, color, className = "" }: { icon: string; color: string; className?: string }) {
  const palette = paletteFor(color);
  return (
    <div
      aria-hidden
      className={`relative flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-lg shadow-black/20 ${className}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${palette.from}, ${palette.to})`, color: palette.ink }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.3)_0%,rgba(255,255,255,0)_45%)]" />
      <div className="absolute -bottom-[18%] -right-[18%] h-[70%] w-[70%] rounded-full bg-white/15" />
      <SkillIcon icon={icon} className="relative h-[46%] w-[46%]" />
    </div>
  );
}
