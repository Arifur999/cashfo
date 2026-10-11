"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber } from "@/lib/number";

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  // A theme token like "var(--chart-1)".
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  // Read aloud instead of the SVG (role="img").
  ariaLabel: string;
  // Shown in the middle, e.g. the total.
  centerLabel?: string;
  centerValue?: string;
  formatValue?: (value: number) => string;
  emptyMessage?: string;
}

// Share-of-total chart (device mix, plan mix, ...) with its legend beside it.
const DonutChart = ({
  slices,
  ariaLabel,
  centerLabel,
  centerValue,
  formatValue = formatNumber,
  emptyMessage = "No data yet.",
}: DonutChartProps) => {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (slices.length === 0 || total === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div role="img" aria-label={ariaLabel} className="relative size-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="100%" paddingAngle={2} strokeWidth={0}>
              {slices.map((slice) => (
                <Cell key={slice.key} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatValue(Number(value))}
              contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)", fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        {centerValue && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-foreground tabular-nums">{centerValue}</span>
            {centerLabel && <span className="text-xs text-muted-foreground">{centerLabel}</span>}
          </div>
        )}
      </div>
      <ul className="w-full space-y-2.5">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} aria-hidden="true" />
            <span className="text-muted-foreground">{slice.label}</span>
            <span className="ml-auto font-medium text-foreground tabular-nums">{formatValue(slice.value)}</span>
            <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">{Math.round((slice.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DonutChart;
