import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

// The brand files in public/brand, by shape. The wordmarks come in an ink
// version for light grounds and a white one for the Night sidebar and the
// hero panels; the mark and the app icon carry their own colours.
const FILES = {
  horizontal: { light: "/brand/smartly-logo.svg", dark: "/brand/smartly-logo-on-dark.svg", ratio: 272.2 / 107 },
  stacked: { light: "/brand/smartly-logo-stacked.svg", dark: "/brand/smartly-logo-stacked-on-dark.svg", ratio: 177.2 / 176 },
  mark: { light: "/brand/smartly-mark.svg", dark: "/brand/smartly-mark.svg", ratio: 100 / 120 },
  icon: { light: "/brand/smartly-app-icon.svg", dark: "/brand/smartly-app-icon.svg", ratio: 1 },
} as const;

interface LogoProps {
  variant?: keyof typeof FILES;
  // On a dark ground (the Night sidebar, the aurora hero).
  onDark?: boolean;
  // Rendered height in px; the width follows the file's own proportions so
  // the layout doesn't shift while the image loads.
  height?: number;
  // "" when the link around it already says "Smartly home".
  alt?: string;
  className?: string;
}

const Logo = ({ variant = "horizontal", onDark = false, height = 40, alt = BRAND_NAME, className }: LogoProps) => {
  const file = FILES[variant];
  return (
    // A plain <img>: next/image can't optimise an SVG, and these are a few KB.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={onDark ? file.dark : file.light}
      alt={alt}
      height={height}
      width={Math.round(height * file.ratio)}
      draggable={false}
      className={cn("block shrink-0 select-none", className)}
    />
  );
};

export default Logo;
