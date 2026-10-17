"use client";

import { useQuery } from "@tanstack/react-query";
import Kpi from "@/components/shared/Kpi";
import { formatCurrency } from "@/lib/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { formatNumber } from "@/lib/number";
import { codesLine } from "@/lib/subscriptions";
import { couponStatsQuery } from "@/queries/coupon.queries";

// The four figures over the list. `month` is this month's name, read on
// the server so the first paint and the hydrated one agree.
const CouponStats = ({ month }: { month: string }) => {
  const stats = useQuery(couponStatsQuery()).data?.data;
  const { translate } = useLocale();
  if (!stats) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi size="sm" label="Active coupons" value={formatNumber(stats.active.count)} note={codesLine(stats.active.codes, translate)} />
      <Kpi size="sm" label={translate("Used in {month}", { month: translate(month) })}
        value={formatNumber(stats.usedThisMonth)}
        note={translate("Out of {count} payments", { count: formatNumber(stats.paymentsThisMonth) })} />
      <Kpi size="sm" label="Money taken off" value={formatCurrency(stats.moneyOffThisMonth, undefined, 0)} note={translate("In {month}", { month: translate(month) })} />
      <Kpi
        size="sm"
        label="Most used ever"
        value={stats.mostUsed ? <span className="font-mono">{stats.mostUsed.code}</span> : "—"}
        note={stats.mostUsed ? plural(translate, stats.mostUsed.times, "{count} time", "{count} times") : "No coupon has been used yet"}
      />
    </div>
  );
};

export default CouponStats;
