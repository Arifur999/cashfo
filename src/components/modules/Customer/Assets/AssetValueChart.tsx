"use client";

import { useId } from "react";
import type { ValuePoint } from "@/lib/customer/assetDisplay";

// The line under a date: "+ Family" when something was added, "− Motorbike"
// in red when only a sale happened there.
export interface PointNote {
  text: string;
  down: boolean;
}

interface AssetValueChartProps {
  points: ValuePoint[];
  // A figure in short ("Tk 18 L"), for the axis and the dots.
  short: (value: number) => string;
  // Year-end points read "Dec 2024"; one asset's, the month of each value.
  label: (point: ValuePoint) => string;
  note: (point: ValuePoint, index: number) => PointNote | null;
  // One asset's line labels every few values; all together, the first,
  // highest and last.
  markAll?: boolean;
  ariaLabel: string;
}

// The board's frame: 1040 x 220, the plot inset 60 left, 30 right, 34 top
// and 64 under it for the dates and notes. Narrower windows scale it across.
const W = 1040;
const H = 220;
const L = 60;
const R = 30;
const TOP = 34;
const PLOT_H = H - TOP - 64;
const PLOT_W = W - L - R;
const pct = (x: number) => `${((x / W) * 100).toFixed(3)}%`;

// The Dashboard's line of value over time against what was paid (dashed):
// each point's dot is green where the value rose, red where it fell, with
// the figure over the first, the highest and the last, and what was added
// or sold under its date.
export function AssetValueChart({ points, short, label, note, markAll = false, ariaLabel }: AssetValueChartProps) {
  const fillId = `asset-fill-${useId().replace(/:/g, "")}`;
  const n = points.length;
  const figures = points.flatMap((point) => [point.value, point.paid]);
  let low = Math.min(...figures);
  let high = Math.max(...figures);
  const span = high - low || high || 1;
  low = Math.max(0, low - span * 0.2);
  high = high + span * 0.15;
  if (high <= low) high = low + 1;
  const x = (i: number) => (n === 1 ? L + PLOT_W / 2 : L + 20 + (i * (PLOT_W - 40)) / (n - 1));
  const y = (value: number) => TOP + (1 - (value - low) / (high - low)) * PLOT_H;
  const path = (key: "value" | "paid") =>
    n === 1 ? `M ${L} ${y(points[0][key]).toFixed(1)} L ${W - R} ${y(points[0][key]).toFixed(1)}` : points.map((point, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(point[key]).toFixed(1)}`).join(" ");
  const line = path("value");
  const area = n > 1 ? `${line} L ${x(n - 1).toFixed(1)} ${TOP + PLOT_H} L ${x(0).toFixed(1)} ${TOP + PLOT_H} Z` : "";
  const grid = [0, 1, 2, 3].map((step) => {
    const value = low + ((high - low) * step) / 3;
    return { value, at: Math.round(y(value)), solid: step === 0 };
  });
  const top = points.reduce((best, point, i) => (point.value > points[best].value ? i : best), 0);
  const stride = Math.max(1, Math.ceil(n / 10));
  const onStride = (i: number) => i % stride === 0 || i === n - 1;

  return (
    <div role="img" aria-label={ariaLabel} className="relative h-55 w-260 max-w-full self-center">
      {grid.map((row) => (
        <span key={row.at} aria-hidden="true">
          <span className={`absolute right-0 left-[5.77%] border-t border-line-card ${row.solid ? "" : "border-dashed"}`} style={{ top: row.at }} />
          <span className="absolute -left-2.5 w-16 text-right text-[10.5px] whitespace-nowrap text-ink-faint tabular-nums" style={{ top: row.at - 8 }}>
            {short(row.value)}
          </span>
        </span>
      ))}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--emerald)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--emerald)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {area && <path d={area} fill={`url(#${fillId})`} stroke="none" />}
        <path d={path("paid")} fill="none" stroke="var(--chart-cost)" strokeWidth="1.75" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
        <path d={line} fill="none" stroke="var(--emerald)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {points.map((point, i) => {
        const before = i ? points[i - 1].value : point.value;
        const dot = i === 0 ? "bg-ink-faint" : point.value > before ? "bg-success" : point.value < before ? "bg-expense-fill" : "bg-emerald";
        const shown = i === n - 1 || i === 0 || i === top || (markAll && onStride(i));
        const under = onStride(i) ? note(point, i) : null;
        const left = pct(x(i));
        const at = y(point.value);
        return (
          <span key={`${point.date}-${i}`} aria-hidden="true">
            <span title={`${label(point)}: ${short(point.value)}`} className={`absolute -mt-[4.5px] -ml-[4.5px] size-[9px] rounded-full shadow-[0_0_0_3px_var(--surface)] ${dot}`} style={{ left, top: Math.round(at) }} />
            {shown && (
              <span className={`absolute -translate-x-1/2 text-[11.5px] font-semibold whitespace-nowrap tabular-nums ${i === n - 1 ? "text-emerald" : "text-ink-soft"}`} style={{ left, top: Math.round(at - 26) }}>
                {short(point.value)}
              </span>
            )}
            {onStride(i) && (
              <span className="absolute top-[174px] -translate-x-1/2 text-[11.5px] whitespace-nowrap text-ink-muted" style={{ left }}>
                {label(point)}
              </span>
            )}
            {under && (
              <span className={`absolute top-48 -translate-x-1/2 text-[11px] font-semibold whitespace-nowrap ${under.down ? "text-loss-ink" : "text-ink-soft"}`} style={{ left }}>
                {under.text}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
