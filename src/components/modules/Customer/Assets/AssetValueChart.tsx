"use client";

import { useId } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ValuePoint } from "@/lib/customer/assetDisplay";
import { currencySymbol, formatCompactAmount, formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// The line under a date: "+ Family" when something was added, "− Motorbike"
// in red when only a sale happened there.
export interface PointNote {
  text: string;
  down: boolean;
}

interface AssetValueChartProps {
  points: ValuePoint[];
  currency: string;
  // "What you paid" for every asset together, "Price paid" for one.
  paidLabel: string;
  // Year-end points read "Dec 2024"; one asset's, the month of each value.
  label: (point: ValuePoint) => string;
  note: (point: ValuePoint, index: number) => PointNote | null;
  // One asset's line marks every value; all together, the first, highest and last.
  markAll?: boolean;
  ariaLabel: string;
}

type Datum = ValuePoint & { name: string; index: number };

// The Dashboard's line of value over time against what was paid (dashed):
// each point's dot is green where the value rose, red where it fell, with
// the figure over the first, the highest and the last, and what was added
// or sold under its date.
export function AssetValueChart({ points, currency, paidLabel, label, note, markAll = false, ariaLabel }: AssetValueChartProps) {
  const { t, fmt } = useLocale();
  const fillId = useId().replace(/:/g, "");
  const data: Datum[] = points.map((point, index) => ({ ...point, name: label(point), index }));
  // The board's headroom: a fifth of the spread under the lowest figure and
  // a bit over the highest, so a flat line sits mid-chart and the axis never
  // repeats one label.
  const figures = points.flatMap((point) => [point.value, point.paid]);
  const low = Math.min(...figures);
  const high = Math.max(...figures);
  const span = high - low || high || 1;
  const domain: [number, number] = [Math.max(0, low - span * 0.2), high + span * 0.15];
  const ticks = [0, 1, 2, 3].map((step) => domain[0] + ((domain[1] - domain[0]) * step) / 3);
  const short = (value: number) => `${currencySymbol(currency, fmt)} ${formatCompactAmount(value, fmt)}`;
  const top = points.reduce((best, point, index) => (point.value > points[best].value ? index : best), 0);
  const last = points.length - 1;

  const dot = ({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) => {
    if (cx === undefined || cy === undefined || index === undefined) return <g key={`dot-${index}`} />;
    const point = points[index];
    const before = index > 0 ? points[index - 1].value : point.value;
    const fill = index === 0 ? "var(--ink-faint)" : point.value > before ? "var(--income)" : point.value < before ? "var(--expense)" : "var(--emerald)";
    const marked = index === 0 || index === last || index === top || markAll;
    return (
      <g key={`dot-${index}`}>
        <circle cx={cx} cy={cy} r={4.5} fill={fill} stroke="var(--surface)" strokeWidth={3} paintOrder="stroke" />
        {marked && (
          <text x={cx} y={cy - 14} textAnchor="middle" fontSize={11.5} fontWeight={600} fill={index === last ? "var(--emerald)" : "var(--ink-soft)"} className="tabular-nums">
            {short(point.value)}
          </text>
        )}
      </g>
    );
  };

  const tick = ({ x, y, payload }: { x?: number | string; y?: number | string; payload?: { value: string; index: number } }) => {
    const index = payload?.index ?? 0;
    const below = points[index] ? note(points[index], index) : null;
    return (
      <g transform={`translate(${x},${y})`}>
        <text y={12} textAnchor="middle" fontSize={11.5} fill="var(--ink-muted)">
          {payload?.value}
        </text>
        {below && (
          <text y={30} textAnchor="middle" fontSize={11} fontWeight={600} fill={below.down ? "var(--expense)" : "var(--ink-soft)"}>
            {below.text}
          </text>
        )}
      </g>
    );
  };

  return (
    <div role="img" aria-label={ariaLabel} className="h-55 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 30, right: 30, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--emerald)" stopOpacity={0.14} />
              <stop offset="100%" stopColor="var(--emerald)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--chart-grid)" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} height={46} tick={tick} padding={{ left: 20, right: 20 }} />
          <YAxis tickLine={false} axisLine={false} fontSize={10.5} stroke="var(--ink-faint)" width={64} tickFormatter={short} domain={domain} ticks={ticks} />
          <Tooltip
            cursor={{ stroke: "var(--line-strong)", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const point = active ? (payload?.[0]?.payload as Datum | undefined) : undefined;
              if (!point) return null;
              return (
                <div className="flex flex-col gap-1 rounded-md border border-line bg-surface px-3 py-2 text-small shadow-card">
                  <span className="font-semibold text-ink">{point.today && !markAll ? t("Today") : formatDate(`${point.date}T00:00:00.000Z`, "d MMM yyyy", fmt)}</span>
                  <span className="text-ink-2 tabular-nums">{`${t("Value")}: ${formatCurrency(point.value, currency, fmt)}`}</span>
                  <span className="text-ink-muted tabular-nums">{`${paidLabel}: ${formatCurrency(point.paid, currency, fmt)}`}</span>
                  {point.added.length > 0 && <span className="text-ink-muted">{t("Added: {names}", { names: point.added.join(", ") })}</span>}
                  {point.sold.length > 0 && <span className="text-expense">{t("Sold: {names}", { names: point.sold.join(", ") })}</span>}
                </div>
              );
            }}
          />
          <Area dataKey="value" type="linear" stroke="none" fill={`url(#${fillId})`} isAnimationActive={false} activeDot={false} />
          <Line dataKey="paid" type="linear" stroke="var(--chart-other)" strokeWidth={2} strokeDasharray="6 5" dot={false} activeDot={false} isAnimationActive={false} />
          <Line dataKey="value" type="linear" stroke="var(--emerald)" strokeWidth={2.5} dot={dot} activeDot={{ r: 5 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
