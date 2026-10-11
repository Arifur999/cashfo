"use client";

import TrendChart from "@/components/shared/charts/TrendChart";
import { formatCurrency } from "@/lib/currency";
import { formatMonthKey } from "@/lib/date";
import type { IRevenueTrendPoint } from "@/types/revenue.types";

// A client component because the axis/tooltip formatters are functions,
// which can't be passed down from a Server Component.
const RevenueTrendChart = ({ trend }: { trend: IRevenueTrendPoint[] }) => {
  return (
    <TrendChart
      data={trend.map((point) => ({ month: point.month, amount: point.amount }))}
      xKey="month"
      series={[{ key: "amount", label: "Revenue", color: "var(--chart-1)" }]}
      ariaLabel="Revenue per month for the last 12 months"
      formatX={(month) => formatMonthKey(month, false)}
      formatY={(amount) => formatCurrency(amount, undefined, 0)}
      emptyMessage="No revenue recorded yet."
    />
  );
};

export default RevenueTrendChart;
