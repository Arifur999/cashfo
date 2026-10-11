"use client";

import { CircleDashed } from "lucide-react";
import { DynamicIcon, type IconName, iconNames } from "lucide-react/dynamic";
import { cn } from "@/lib/utils";

const KNOWN_ICONS = new Set<string>(iconNames);

export const isLucideIconName = (value: string | null | undefined): value is IconName => Boolean(value && KNOWN_ICONS.has(value));

interface IconPreviewProps {
  // Kebab-case lucide name, e.g. "shopping-bag".
  name: string | null | undefined;
  className?: string;
}

// Shows an icon chosen by name (category icons and the like) while loading
// only that one icon on demand -- never the whole set. Unknown names get a
// placeholder instead of DynamicIcon's console error.
const IconPreview = ({ name, className }: IconPreviewProps) => {
  if (!isLucideIconName(name)) {
    return <CircleDashed className={cn("size-4 text-muted-foreground/50", className)} aria-hidden="true" />;
  }
  return <DynamicIcon name={name} className={cn("size-4", className)} aria-hidden="true" />;
};

export default IconPreview;
