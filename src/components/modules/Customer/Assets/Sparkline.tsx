import { sparkline } from "@/lib/customer/assetDisplay";
import { cn } from "@/lib/utils";

interface SparklineProps {
  // Oldest first.
  values: number[];
  // What it shows, for screen readers.
  label: string;
  className?: string;
}

const WIDTH = 130;
const HEIGHT = 40;

// A small line of an asset's values: green when it ended above where it
// started, red below, grey when flat.
export function Sparkline({ values, label, className }: SparklineProps) {
  const points = sparkline(values, WIDTH, HEIGHT);
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  const tone = last > first ? "text-income" : last < first ? "text-expense" : "text-ink-muted";
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} className={cn("shrink-0", tone, className)}>
      <polygon points={points.area} fill="currentColor" opacity={0.12} />
      <polyline points={points.line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={points.lastX} cy={points.lastY} r={3} fill="currentColor" />
    </svg>
  );
}
