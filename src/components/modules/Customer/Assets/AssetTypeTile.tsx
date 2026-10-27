import { createElement } from "react";
import type { CategoryVisual } from "@/lib/customer/assetDisplay";
import { cn } from "@/lib/utils";

const SIZES = {
  // The type chips in Add asset.
  chip: "size-5.5 rounded-full [&_svg]:size-3",
  sm: "size-8 rounded-md [&_svg]:size-4",
  md: "size-9 rounded-md [&_svg]:size-4.5",
  lg: "size-10 rounded-md [&_svg]:size-4.5",
  // The Current assets cards (the glossy 48px tile with a 28px icon).
  xl: "size-12 rounded-lg [&_svg]:size-5.5",
  // The Asset categories cards (56px, 16px corners).
  "2xl": "size-14 rounded-lg [&_svg]:size-7",
} as const;

interface AssetTypeTileProps {
  visual: CategoryVisual;
  size?: keyof typeof SIZES;
  // design-v4's raised tile (Current assets, Asset categories): white fading
  // into the type's soft colour, a hairline ring in its colour, and the icon
  // drawn thin with a light fill.
  glossy?: boolean;
  className?: string;
}

// An asset type's icon on its colour's soft tile, the same on every page
// and drawer. Decorative: the type's name is always written beside it.
export function AssetTypeTile({ visual, size = "md", glossy = false, className }: AssetTypeTileProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("flex shrink-0 items-center justify-center", SIZES[size], glossy ? visual.tone.fg : [visual.tone.bg, visual.tone.fg], glossy && size === "xl" && "[&_svg]:size-7", className)}
      style={glossy ? { background: `linear-gradient(160deg, var(--surface) 0%, color-mix(in srgb, ${visual.color} 16%, var(--surface)) 100%)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${visual.color} 20%, transparent)` } : undefined}
    >
      {createElement(visual.icon, glossy ? { strokeWidth: 1.5, fill: "currentColor", fillOpacity: 0.26 } : {})}
    </span>
  );
}
