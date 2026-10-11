import { CircleDashed } from "lucide-react";
import { createElement } from "react";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";

interface IconPreviewProps {
  // Kebab-case icon name as the apps store it, e.g. "shopping-bag".
  name: string | null | undefined;
  className?: string;
}

// Shows an icon chosen by name (category icons and the like) from the
// curated registry in lib/categoryIcons.ts; unknown names get a placeholder.
// createElement because the icon is looked up, not written as a tag (the
// registry entries are module-level components, not created per render).
const IconPreview = ({ name, className }: IconPreviewProps) => {
  const icon = getCategoryIcon(name);

  return createElement(icon ?? CircleDashed, {
    className: cn("size-4", !icon && "text-muted-foreground/50", className),
    "aria-hidden": true,
  });
};

export default IconPreview;
