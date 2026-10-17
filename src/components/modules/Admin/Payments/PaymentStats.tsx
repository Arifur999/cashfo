"use client";

import { useQuery } from "@tanstack/react-query";
import Card from "@/components/smartly/Card";
import Kpi from "@/components/shared/Kpi";
import { formatCurrency } from "@/lib/currency";
import { formatMonthName } from "@/lib/date";
import { formatNumber } from "@/lib/number";
import { GATEWAY_BAR_CLASS } from "@/lib/payments";
import { humanizeEnum } from "@/lib/statusBadge";
import { cn } from "@/lib/utils";
import { paymentStatsQuery } from "@/queries/payment.queries";

const money = (value: string) => formatCurrency(value, undefined, 0);

// The design's four figures over the list, and how people paid last month.
const PaymentStats = () => {
  const stats = useQuery(paymentStatsQuery()).data?.data;
  if (!stats) {
    return null;
  }

  const last = formatMonthName(stats.lastMonth.month);
  const change = stats.lastMonth.changePct;
  const gatewayTotal = stats.gatewaysLastMonth.reduce((sum, row) => sum + row.count, 0);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          size="sm"
          label={`Collected in ${last}`}
          value={money(stats.lastMonth.collected)}
          note={
            <span className={change !== null && change >= 0 ? "text-emerald" : change !== null ? "text-expense" : undefined}>
              {formatNumber(stats.lastMonth.payments)} {stats.lastMonth.payments === 1 ? "payment" : "payments"}
              {change !== null && ` · ${change >= 0 ? "up" : "down"} ${Math.abs(change)}% on the month before`}
            </span>
          }
        />
        <Kpi
          size="sm"
          label={`${formatMonthName(stats.thisMonth.month)} so far`}
          value={money(stats.thisMonth.collected)}
          note={`${formatNumber(stats.thisMonth.payments)} ${stats.thisMonth.payments === 1 ? "payment" : "payments"} in ${stats.thisMonth.days} ${stats.thisMonth.days === 1 ? "day" : "days"}`}
        />
        <Kpi
          size="sm"
          label="Failed, last 7 days"
          value={formatNumber(stats.failedLast7Days.count)}
          note={<span className={stats.failedLast7Days.count > 0 ? "text-expense" : undefined}>{money(stats.failedLast7Days.amount)} not collected yet</span>}
        />
        <Kpi
          size="sm"
          label={`Refunds in ${last}`}
          value={formatNumber(stats.refundsLastMonth.count)}
          note={<span className={stats.refundsLastMonth.count > 0 ? "text-warning" : undefined}>{money(stats.refundsLastMonth.amount)} sent back</span>}
        />
      </div>
      <Card padding="none" className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:gap-4">
        <h2 className="text-body font-semibold whitespace-nowrap text-ink">How people paid in {last}</h2>
        {gatewayTotal === 0 ? (
          <span className="text-small text-ink-muted">No payments came in.</span>
        ) : (
          <>
            <div role="img" aria-label={stats.gatewaysLastMonth.map((row) => `${humanizeEnum(row.gateway)} ${row.count}`).join(", ")} className="flex h-3 grow overflow-hidden rounded-full">
              {stats.gatewaysLastMonth.map((row) => (
                <span key={row.gateway} className={GATEWAY_BAR_CLASS[row.gateway]} style={{ width: `${(row.count / gatewayTotal) * 100}%` }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-small text-ink-2">
              {stats.gatewaysLastMonth.map((row) => (
                <span key={row.gateway} className="flex items-center gap-1 whitespace-nowrap">
                  <span className={cn("size-2.25 rounded-[3px]", GATEWAY_BAR_CLASS[row.gateway])} aria-hidden="true" />
                  {humanizeEnum(row.gateway)} <b className="font-semibold text-ink">{formatNumber(row.count)}</b>
                </span>
              ))}
            </div>
          </>
        )}
      </Card>
    </>
  );
};

export default PaymentStats;
