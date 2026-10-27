"use client";

import { useQuery } from "@tanstack/react-query";
import LoadError from "@/components/modules/Admin/Payments/LoadError";
import { countPhrase } from "@/components/modules/Admin/Payments/paymentsDisplay";
import Kpi from "@/components/shared/Kpi";
import { formatCurrency } from "@/lib/currency";
import { formatMonthName } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { payoutStatsQuery } from "@/queries/navBadge.queries";

// The desk's four figures: what waits for a look, what is approved and
// still to send, what went out this month, and the commissions still inside
// the refund window. Totals are whole taka.
const PayoutStats = ({ holdDays }: { holdDays: number | null }) => {
  const query = useQuery(payoutStatsQuery());
  const stats = query.data?.data;
  const { translate, locale } = useLocale();
  if (!stats) {
    return query.isError ? <LoadError title="Couldn't load these figures" onRetry={() => void query.refetch()} /> : null;
  }

  const money = (value: string) => formatCurrency(value, undefined, 0, locale);
  const requests = (count: number) => countPhrase(translate, locale, count, "{count} request", "{count} requests");

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <Kpi size="sm" label="Waiting for review" value={<span className="text-warning">{money(stats.waiting.amount)}</span>} note={requests(stats.waiting.count)} />
      <Kpi size="sm" label="Approved, to send" value={money(stats.approved.amount)} note={requests(stats.approved.count)} />
      <Kpi
        size="sm"
        label={translate("Paid in {month}", { month: translate(formatMonthName(stats.paidThisMonth.month)) })}
        value={<span className="text-emerald">{money(stats.paidThisMonth.amount)}</span>}
        note={countPhrase(translate, locale, stats.paidThisMonth.count, "{count} payout", "{count} payouts")}
      />
      <Kpi
        size="sm"
        label="Commission on hold"
        value={money(stats.onHold.amount)}
        note={
          holdDays === null
            ? countPhrase(translate, locale, stats.onHold.count, "{count} purchase inside the refund window", "{count} purchases inside the refund window")
            : countPhrase(translate, locale, stats.onHold.count, "{count} purchase inside the {days}-day window", "{count} purchases inside the {days}-day window", { days: formatCount(holdDays, locale) })
        }
      />
    </div>
  );
};

export default PayoutStats;
