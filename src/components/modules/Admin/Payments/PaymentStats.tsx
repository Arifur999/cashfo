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
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";

const money = (value: string) => formatCurrency(value, undefined, 0);

// The design's four figures over the list, and how people paid last month.
const PaymentStats = () => {
  const stats = useQuery(paymentStatsQuery()).data?.data;
  const { translate } = useLocale();
  if (!stats) {
    return null;
  }

  const last = translate(formatMonthName(stats.lastMonth.month));
  const lastPayments = plural(translate, stats.lastMonth.payments, "{count} payment", "{count} payments");
  const change = stats.lastMonth.changePct;
  const gatewayTotal = stats.gatewaysLastMonth.reduce((sum, row) => sum + row.count, 0);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          size="sm"
          label={translate("Collected in {month}", { month: last })}
          value={money(stats.lastMonth.collected)}
          note={
            <span className={change !== null && change >= 0 ? "text-emerald" : change !== null ? "text-expense" : undefined}>
              {change === null
                ? lastPayments
                : translate(change >= 0 ? "{payments} · up {percent}% on the month before" : "{payments} · down {percent}% on the month before", {
                    payments: lastPayments,
                    percent: Math.abs(change),
                  })}
            </span>
          }
        />
        <Kpi
          size="sm"
          label={translate("{month} so far", { month: translate(formatMonthName(stats.thisMonth.month)) })}
          value={money(stats.thisMonth.collected)}
          note={translate("{payments} in {days}", {
            payments: plural(translate, stats.thisMonth.payments, "{count} payment", "{count} payments"),
            days: plural(translate, stats.thisMonth.days, "{count} day", "{count} days"),
          })}
        />
        <Kpi
          size="sm"
          label="Failed, last 7 days"
          value={formatNumber(stats.failedLast7Days.count)}
          note={<span className={stats.failedLast7Days.count > 0 ? "text-expense" : undefined}>{translate("{amount} not collected yet", { amount: money(stats.failedLast7Days.amount) })}</span>}
        />
        <Kpi
          size="sm"
          label={translate("Refunds in {month}", { month: last })}
          value={formatNumber(stats.refundsLastMonth.count)}
          note={<span className={stats.refundsLastMonth.count > 0 ? "text-warning" : undefined}>{translate("{amount} sent back", { amount: money(stats.refundsLastMonth.amount) })}</span>}
        />
      </div>
      <Card padding="none" className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:gap-4">
        <h2 className="text-body font-semibold whitespace-nowrap text-ink">{translate("How people paid in {month}", { month: last })}</h2>
        {gatewayTotal === 0 ? (
          <span className="text-small text-ink-muted"><T>No payments came in.</T></span>
        ) : (
          <>
            <div role="img" aria-label={stats.gatewaysLastMonth.map((row) => `${translate(humanizeEnum(row.gateway))} ${row.count}`).join(", ")} className="flex h-3 grow overflow-hidden rounded-full">
              {stats.gatewaysLastMonth.map((row) => (
                <span key={row.gateway} className={GATEWAY_BAR_CLASS[row.gateway]} style={{ width: `${(row.count / gatewayTotal) * 100}%` }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-small text-ink-2">
              {stats.gatewaysLastMonth.map((row) => (
                <span key={row.gateway} className="flex items-center gap-1 whitespace-nowrap">
                  <span className={cn("size-2.25 rounded-[3px]", GATEWAY_BAR_CLASS[row.gateway])} aria-hidden="true" />
                  {translate(humanizeEnum(row.gateway))} <b className="font-semibold text-ink">{formatNumber(row.count)}</b>
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
