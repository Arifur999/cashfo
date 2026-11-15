"use client";

import { useQuery } from "@tanstack/react-query";
import Card from "@/components/smartly/Card";
import Kpi from "@/components/shared/Kpi";
import { formatCurrency } from "@/lib/currency";
import { formatMonthName } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { GATEWAY_BAR_CLASS } from "@/lib/payments";
import { humanizeEnum } from "@/lib/statusBadge";
import { cn } from "@/lib/utils";
import { paymentStatsQuery } from "@/queries/payment.queries";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n/translate";
import LoadError from "./LoadError";
import { countPhrase, PAYMENTS_LIST_HREF } from "./paymentsDisplay";

// Totals over many payments, in whole taka.
const money = (value: string, locale: Locale) => formatCurrency(value, undefined, 0, locale);

interface PaymentStatsProps {
  // The day the "last 7 days" start (yyyy-MM-dd), read by the page.
  failedSince: string;
}

// The design's four figures over the list, and how people paid last month.
const PaymentStats = ({ failedSince }: PaymentStatsProps) => {
  const query = useQuery(paymentStatsQuery());
  const stats = query.data?.data;
  const { translate, locale } = useLocale();
  if (!stats) {
    // Never a blank where the figures were: say they couldn't load.
    return query.isError ? <LoadError title="Couldn't load these figures" onRetry={() => void query.refetch()} /> : null;
  }

  const count = (value: number) => formatCount(value, locale);
  const payments = (value: number) => countPhrase(translate, locale, value, "{count} payment", "{count} payments");
  const last = translate(formatMonthName(stats.lastMonth.month));
  const lastPayments = payments(stats.lastMonth.payments);
  const change = stats.lastMonth.changePct;
  const gatewayTotal = stats.gatewaysLastMonth.reduce((sum, row) => sum + row.count, 0);

  return (
    <>
      {/* Two across on a phone: the figures are short, and four full-width
          tiles would push the list a screen down. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-3.5 xl:grid-cols-4">
        <Kpi
          size="sm"
          figure={23}
          label={translate("Collected in {month}", { month: last })}
          value={money(stats.lastMonth.collected, locale)}
          note={
            <span className={change !== null && change >= 0 ? "text-emerald" : change !== null ? "text-expense" : undefined}>
              {change === null
                ? lastPayments
                : translate(change >= 0 ? "{payments} · up {percent}% on the month before" : "{payments} · down {percent}% on the month before", {
                    payments: lastPayments,
                    percent: toLocaleDigits(String(Math.abs(change)), locale),
                  })}
            </span>
          }
        />
        <Kpi
          size="sm"
          figure={23}
          label={translate("{month} so far", { month: translate(formatMonthName(stats.thisMonth.month)) })}
          value={money(stats.thisMonth.collected, locale)}
          note={translate("{payments} in {days}", {
            payments: payments(stats.thisMonth.payments),
            days: countPhrase(translate, locale, stats.thisMonth.days, "{count} day", "{count} days"),
          })}
        />
        {/* The failures open the failed payments of those days: the card is the link. */}
        <Kpi
          size="sm"
          figure={23}
          href={`${PAYMENTS_LIST_HREF}?status=FAILED&dateFrom=${failedSince}`}
          label="Failed, last 7 days"
          value={count(stats.failedLast7Days.count)}
          note={<span className={stats.failedLast7Days.count > 0 ? "text-expense" : undefined}>{translate("{amount} not collected yet", { amount: money(stats.failedLast7Days.amount, locale) })}</span>}
        />
        {/* No link: the list goes by the day a payment was made, not the
            day it was refunded, so no filter shows a month's refunds. */}
        <Kpi
          size="sm"
          figure={23}
          label={translate("Refunds in {month}", { month: last })}
          value={count(stats.refundsLastMonth.count)}
          note={<span className={stats.refundsLastMonth.count > 0 ? "text-warning" : undefined}>{translate("{amount} sent back", { amount: money(stats.refundsLastMonth.amount, locale) })}</span>}
        />
      </div>
      <Card padding="none" className="flex flex-col gap-3 px-4.5 py-3.5 lg:flex-row lg:items-center lg:gap-4">
        <h2 className="text-body font-semibold whitespace-nowrap text-ink">{translate("How people paid in {month}", { month: last })}</h2>
        {gatewayTotal === 0 ? (
          <span className="text-small text-ink-muted"><T>No payments came in.</T></span>
        ) : (
          <>
            <div role="img" aria-label={stats.gatewaysLastMonth.map((row) => `${translate(humanizeEnum(row.gateway))} ${count(row.count)}`).join(", ")} className="flex h-3 grow overflow-hidden rounded-full">
              {stats.gatewaysLastMonth.map((row) => (
                <span key={row.gateway} className={GATEWAY_BAR_CLASS[row.gateway]} style={{ width: `${(row.count / gatewayTotal) * 100}%` }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-small text-ink-2">
              {stats.gatewaysLastMonth.map((row) => (
                <span key={row.gateway} className="flex items-center gap-1 whitespace-nowrap">
                  <span className={cn("size-2.25 rounded-[3px]", GATEWAY_BAR_CLASS[row.gateway])} aria-hidden="true" />
                  {translate(humanizeEnum(row.gateway))} <b className="font-semibold text-ink">{count(row.count)}</b>
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
