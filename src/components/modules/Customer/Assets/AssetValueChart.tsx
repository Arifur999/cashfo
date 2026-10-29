"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ValuePoint } from "@/lib/customer/assetDisplay";
import { formatCompactAmount, formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface AssetValueChartProps {
  points: ValuePoint[];
  currency: string;
  // "What you paid" for every asset together, "Starting price" for one.
  paidLabel: string;
  // Year-end points read "Dec 2024"; one asset's, the month of each value.
  label: (point: ValuePoint) => string;
  ariaLabel: string;
}

// The Dashboard's line of value over time against what was paid (dashed),
// with the figure and what was added on hover.
export function AssetValueChart({ points, currency, paidLabel, label, ariaLabel }: AssetValueChartProps) {
  const { t, fmt } = useLocale();
  const data = points.map((point) => ({ ...point, name: label(point) }));
  // The board's headroom: a fifth of the spread under the lowest figure and
  // a bit over the highest, so a flat line sits mid-chart and the axis never
  // repeats one label.
  const figures = points.flatMap((point) => [point.value, point.paid]);
  const low = Math.min(...figures);
  const high = Math.max(...figures);
  const span = high - low || high || 1;
  const domain: [number, number] = [Math.max(0, low - span * 0.2), high + span * 0.15];
  return (
    <div role="img" aria-label={ariaLabel} className="h-75 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--chart-grid)" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="var(--ink-muted)" minTickGap={16} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--ink-muted)" width={56} tickFormatter={(value: number) => formatCompactAmount(value, fmt)} domain={domain} tickCount={4} />
          <Tooltip
            cursor={{ stroke: "var(--line-strong)", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const point = active ? (payload?.[0]?.payload as (ValuePoint & { name: string }) | undefined) : undefined;
              if (!point) return null;
              return (
                <div className="flex flex-col gap-1 rounded-md border border-line bg-surface px-3 py-2 text-small shadow-card">
                  <span className="font-semibold text-ink">{point.today ? t("Today") : formatDate(`${point.date}T00:00:00.000Z`, "d MMM yyyy", fmt)}</span>
                  <span className="text-ink-2 tabular-nums">{`${t("Value")}: ${formatCurrency(point.value, currency, fmt)}`}</span>
                  <span className="text-ink-muted tabular-nums">{`${paidLabel}: ${formatCurrency(point.paid, currency, fmt)}`}</span>
                  {point.added.length > 0 && <span className="text-ink-muted">{t("Added: {names}", { names: point.added.join(", ") })}</span>}
                </div>
              );
            }}
          />
          <Line dataKey="paid" type="linear" stroke="var(--chart-other)" strokeWidth={2} strokeDasharray="6 5" dot={false} isAnimationActive={false} />
          <Line dataKey="value" type="linear" stroke="var(--emerald)" strokeWidth={2.75} dot={{ r: 4, fill: "var(--surface)", strokeWidth: 2.5 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
