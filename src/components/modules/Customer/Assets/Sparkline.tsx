import { sparkline } from "@/lib/customer/assetDisplay";
import { cn } from "@/lib/utils";

interface SparklineProps {
  // Oldest first.
  values: number[];
  // What it shows, for screen readers.
  label: string;
  // The line's colour as a CSS value (an asset type's token, so dark mode
  // follows). Without one it shows the gain: green, red or grey.
  color?: string;
  className?: string;
}

const WIDTH = 130;
const HEIGHT = 40;

// A small line of an asset's values, in its type's colour when given one;
// otherwise green when it ended above where it started, red below, grey
// when flat. currentColor draws the fill, the line and the dot.
export function Sparkline({ values, label, color, className }: SparklineProps) {
  const points = sparkline(values, WIDTH, HEIGHT);
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  const tone = color ? undefined : last > first ? "text-income" : last < first ? "text-expense" : "text-ink-muted";
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} style={color ? { color } : undefined} className={cn("shrink-0", tone, className)}>
      <polygon points={points.area} fill="currentColor" opacity={0.12} />
      <polyline points={points.line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={points.lastX} cy={points.lastY} r={3} fill="currentColor" />
    </svg>
  );
}
