import { createElement } from "react";
import type { CategoryVisual } from "@/lib/customer/assetDisplay";
import { cn } from "@/lib/utils";

const SIZES = {
  // The type chips in Add asset.
  chip: "size-5.5 rounded-full [&_svg]:size-3",
  sm: "size-8 rounded-md [&_svg]:size-4",
  md: "size-9 rounded-md [&_svg]:size-4.5",
  lg: "size-10 rounded-md [&_svg]:size-4.5",
  // The Asset types cards.
  xl: "size-12 rounded-lg [&_svg]:size-5.5",
} as const;

interface AssetTypeTileProps {
  visual: CategoryVisual;
  size?: keyof typeof SIZES;
  className?: string;
}

// An asset type's icon on its colour's soft tile, the same on every page
// and drawer. Decorative: the type's name is always written beside it.
export function AssetTypeTile({ visual, size = "md", className }: AssetTypeTileProps) {
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center", SIZES[size], visual.tone.bg, visual.tone.fg, className)}>
      {createElement(visual.icon)}
    </span>
  );
}
