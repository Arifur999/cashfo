"use client";

import { useQuery } from "@tanstack/react-query";
import Kpi from "@/components/shared/Kpi";
import { formatCurrency } from "@/lib/currency";
import { formatNumber } from "@/lib/number";
import { codesLine } from "@/lib/subscriptions";
import { couponStatsQuery } from "@/queries/coupon.queries";

// The four figures over the list. `month` is this month's name, read on
// the server so the first paint and the hydrated one agree.
const CouponStats = ({ month }: { month: string }) => {
  const stats = useQuery(couponStatsQuery()).data?.data;
  if (!stats) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi size="sm" label="Active coupons" value={formatNumber(stats.active.count)} note={codesLine(stats.active.codes)} />
      <Kpi size="sm" label={`Used in ${month}`} value={formatNumber(stats.usedThisMonth)} note={`Out of ${formatNumber(stats.paymentsThisMonth)} payments`} />
      <Kpi size="sm" label="Money taken off" value={formatCurrency(stats.moneyOffThisMonth, undefined, 0)} note={`In ${month}`} />
      <Kpi
        size="sm"
        label="Most used ever"
        value={stats.mostUsed ? <span className="font-mono">{stats.mostUsed.code}</span> : "—"}
        note={stats.mostUsed ? `${formatNumber(stats.mostUsed.times)} ${stats.mostUsed.times === 1 ? "time" : "times"}` : "No coupon has been used yet"}
      />
    </div>
  );
};

export default CouponStats;
