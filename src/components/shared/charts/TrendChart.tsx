"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface TrendSeries {
  key: string;
  label: string;
  // A theme token like "var(--chart-1)", so the chart follows the theme.
  color: string;
}

// One row per x value, e.g. { month: "2026-10", amount: 1200 }. A plain record
// (not a generic) so recharts' typed dataKey resolves.
export type TrendPoint = Record<string, string | number>;

interface TrendChartProps {
  data: TrendPoint[];
  xKey: string;
  series: TrendSeries[];
  // Read aloud instead of the SVG (role="img").
  ariaLabel: string;
  formatX?: (value: string) => string;
  formatY?: (value: number) => string;
  height?: number;
  emptyMessage?: string;
}

// Area chart for one or more series over time (revenue by month, DAU/WAU).
const TrendChart = ({
  data,
  xKey,
  series,
  ariaLabel,
  formatX,
  formatY,
  height = 260,
  emptyMessage = "No data for this period.",
}: TrendChartProps) => {
  // Gradient ids must be unique per instance, or two charts on one page
  // would share (and overwrite) each other's fills.
  const gradientPrefix = useId().replace(/:/g, "");

  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div role="img" aria-label={ariaLabel} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {series.map((item) => (
              <linearGradient key={item.key} id={`${gradientPrefix}-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={item.color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={item.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatX}
            fontSize={12}
            stroke="var(--muted-foreground)"
            minTickGap={16}
          />
          <YAxis tickLine={false} axisLine={false} tickFormatter={formatY} fontSize={12} width={64} stroke="var(--muted-foreground)" />
          <Tooltip
            formatter={(value) => (formatY ? formatY(Number(value)) : String(value))}
            labelFormatter={(label) => (formatX ? formatX(String(label)) : String(label))}
            contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--popover)", fontSize: 12 }}
          />
          {series.map((item) => (
            <Area
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.label}
              stroke={item.color}
              strokeWidth={2}
              fill={`url(#${gradientPrefix}-${item.key})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;
