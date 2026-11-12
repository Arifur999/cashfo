import type { AssetCategoryOption } from "@/lib/customer/api";
import { currencySymbol, formatCompactAmount } from "@/lib/customer/currency";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { type FormatLocale, fmtOf, langOf } from "@/lib/i18n/formatPrefs";
import { cn } from "@/lib/utils";

// The Assets boards' own seven category glyphs (24px grid), drawn thin with
// a light fill in the category's colour.
const PATHS = {
  land: "M2.5 19.5 8.5 9l3.6 5.4 2.9-3.9 6.5 9Z M2 19.5h20 M17 4a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Z",
  vehicle: "M3.5 15.5v-3l1.9-4.1A2.5 2.5 0 0 1 7.7 7h8.6a2.5 2.5 0 0 1 2.3 1.4l1.9 4.1v3Z M3.5 12.5h17 M7.5 14.5a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z M16.5 14.5a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z",
  property: "M4 20.5V9.5l8-6 8 6v11Z M2.5 20.5h19 M9.5 20.5v-5.5h5v5.5Z M8 11.5h2 M14 11.5h2",
  jewellery: "M7 4h10l4 5.5L12 20 3 9.5Z M3 9.5h18 M10 4 8.5 9.5 12 20l3.5-10.5L14 4",
  electronics: "M5 4.5h14a1 1 0 0 1 1 1V15H4V5.5a1 1 0 0 1 1-1Z M2 15h20l-1 3a1.5 1.5 0 0 1-1.4 1H4.4A1.5 1.5 0 0 1 3 18Z M10 17h4",
  investment: "M4 20v-5h3.5v5Z M10.25 20v-8h3.5v8Z M16.5 20V10h3.5v10Z M18.25 3.5a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Z M2.5 20h19",
  box: "M21 8 12 3 3 8v8l9 5 9-5Z M3 8l9 5 9-5 M12 13v8",
} as const;

export type AssetIconKey = keyof typeof PATHS;

// The picker's seven, in the board's order: the glyph, the icon name the
// backend stores for it, and its name.
export const ASSET_ICONS: { key: AssetIconKey; stored: string; label: string }[] = [
  { key: "land", stored: "mountain", label: "Land" },
  { key: "vehicle", stored: "car", label: "Vehicle" },
  { key: "property", stored: "building-2", label: "House or flat" },
  { key: "jewellery", stored: "gem", label: "Jewellery" },
  { key: "electronics", stored: "laptop", label: "Electronics" },
  { key: "investment", stored: "trending-up", label: "Investment" },
  { key: "box", stored: "package", label: "Other" },
];

// A stored icon name read as one of the seven (older categories may carry
// another of the budget icons: the nearest glyph, else the box).
const STORED: Record<string, AssetIconKey> = {
  mountain: "land",
  trees: "land",
  car: "vehicle",
  bike: "vehicle",
  "building-2": "property",
  building: "property",
  home: "property",
  house: "property",
  gem: "jewellery",
  laptop: "electronics",
  smartphone: "electronics",
  "trending-up": "investment",
  "chart-line": "investment",
  package: "box",
};

export const assetIconKey = (icon: string | null | undefined): AssetIconKey => (icon && STORED[icon]) || "box";

// The ten swatches, in the board's order: the colour name the backend
// stores and the swatch's own name.
export const ASSET_SWATCHES: { stored: string; label: string }[] = [
  { stored: "green", label: "Green" },
  { stored: "blue", label: "Blue" },
  { stored: "orange", label: "Orange" },
  { stored: "pink", label: "Pink" },
  { stored: "purple", label: "Purple" },
  { stored: "teal", label: "Teal" },
  { stored: "yellow", label: "Gold" },
  { stored: "indigo", label: "Indigo" },
  { stored: "red", label: "Red" },
  { stored: "lime", label: "Leaf green" },
];

const INKS: Record<string, string> = {
  green: "--asset-green",
  blue: "--asset-blue",
  orange: "--asset-orange",
  pink: "--asset-pink",
  purple: "--asset-purple",
  violet: "--asset-purple",
  teal: "--asset-teal",
  cyan: "--asset-teal",
  yellow: "--asset-gold",
  amber: "--asset-gold",
  indigo: "--asset-indigo",
  red: "--asset-red",
  lime: "--asset-leaf",
};

// A stored colour name as its CSS colour (grey for one the boards don't know).
export const assetInk = (color: string | null | undefined): string => `var(${(color && INKS[color]) || "--asset-grey"})`;

export interface AssetLook {
  // The category's own name ("" when it is gone); translate with t().
  name: string;
  ink: string;
  icon: AssetIconKey;
}

export function assetLook(categories: Pick<AssetCategoryOption, "name" | "icon" | "color">[], name: string): AssetLook {
  const match = categories.find((category) => category.name === name);
  return { name, ink: assetInk(match?.color), icon: assetIconKey(match?.icon) };
}

// The soft tile under a glyph: 14% of the colour on the surface (the
// board's shade(c, 0.86)).
export const assetSoft = (ink: string) => `color-mix(in srgb, ${ink} 14%, var(--surface))`;

interface AssetGlyphProps {
  icon: AssetIconKey;
  ink: string;
  size: number;
  stroke?: number;
  fill?: number;
  className?: string;
}

export function AssetGlyph({ icon, ink, size, stroke = 1.75, fill = 0.2, className }: AssetGlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={ink} fillOpacity={fill} stroke={ink} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cn("shrink-0", className)}>
      <path d={PATHS[icon]} />
    </svg>
  );
}

interface AssetTileProps extends Omit<AssetGlyphProps, "ink" | "icon" | "size"> {
  look: Pick<AssetLook, "ink" | "icon">;
  // The tile's size and corners, as classes ("size-9 rounded-[10px]").
  className: string;
  glyph: number;
  // The raised tile (All Assets, Category): white fading into the soft
  // colour, with a hairline ring in the colour.
  glossy?: boolean;
}

// A category's glyph on its tile. Decorative: the name is always beside it.
export function AssetTile({ look, className, glyph, glossy = false, stroke, fill }: AssetTileProps) {
  const soft = assetSoft(look.ink);
  return (
    <span
      aria-hidden="true"
      className={cn("flex shrink-0 items-center justify-center", className)}
      style={glossy ? { background: `linear-gradient(160deg, var(--surface) 0%, ${soft} 100%)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${look.ink} 20%, transparent)` } : { background: soft }}
    >
      <AssetGlyph icon={look.icon} ink={look.ink} size={glyph} stroke={stroke} fill={fill} />
    </span>
  );
}

// The boards' tone for a change: green up, red down, quiet when nothing moved.
export function assetTone(change: number): { ink: string; wash: string; chip: string } {
  if (change > 0) return { ink: "text-tint-green-ink", wash: "bg-gain-wash", chip: "bg-tint-green" };
  if (change < 0) return { ink: "text-loss-ink", wash: "bg-loss-wash", chip: "bg-expense-soft" };
  return { ink: "text-ink-soft", wash: "bg-surface-sunken", chip: "bg-surface-sunken" };
}

// A change as a share of what it changed from: "+25.0%", "−18.2%", "0%".
export function changePercent(change: number, base: number): string {
  if (!base) return "0%";
  const percent = (change / base) * 100;
  if (Math.abs(percent) < 0.05) return "0%";
  return `${percent > 0 ? "+" : "−"}${Math.abs(percent).toFixed(1)}%`;
}

// The Assets boards' short figure ("Tk 18 L", "Tk 1.25 Cr", "Tk 60K"; in
// Bangla "লাখ", "কোটি", "হাজার"): crore to two places, lakh to one,
// thousands whole. A reader who groups in threes gets K, M and B instead.
export function assetShort(value: number, currency: string, fmt: FormatLocale): string {
  const sign = value < 0 ? "−" : "";
  const abs = Math.abs(value);
  const symbol = currencySymbol(currency, fmt);
  if (fmtOf(fmt).grouping !== "lakh") return `${sign}${symbol} ${formatCompactAmount(abs, fmt)}`;
  const bn = langOf(fmt) === "bn";
  const trim = (text: string) => text.replace(/\.?0+$/, "");
  let figure: string;
  if (abs >= 1e7) figure = `${trim((abs / 1e7).toFixed(2))}${bn ? " কোটি" : " Cr"}`;
  else if (abs >= 1e5) figure = `${(abs / 1e5).toFixed(1).replace(/\.0$/, "")}${bn ? " লাখ" : " L"}`;
  else if (abs >= 1e3) figure = `${Math.round(abs / 1e3)}${bn ? " হাজার" : "K"}`;
  else figure = String(Math.round(abs));
  return `${sign}${symbol} ${toLocaleDigits(figure, fmt)}`;
}
