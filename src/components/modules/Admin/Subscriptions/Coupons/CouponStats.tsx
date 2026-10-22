"use client";

import { useQuery } from "@tanstack/react-query";
import Kpi from "@/components/shared/Kpi";
import LoadError from "@/components/modules/Admin/Payments/LoadError";
import { countPhrase } from "@/components/modules/Admin/Payments/paymentsDisplay";
import { formatCurrency } from "@/lib/currency";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { codesLine } from "@/lib/subscriptions";
import { couponStatsQuery } from "@/queries/coupon.queries";

// The four figures over the list. `month` is this month's name, read on
// the server so the first paint and the hydrated one agree.
const CouponStats = ({ month }: { month: string }) => {
  const query = useQuery(couponStatsQuery());
  const stats = query.data?.data;
  const { translate, locale } = useLocale();
  if (!stats) {
    // Never a blank where the figures were: say they couldn't load.
    return query.isError ? <LoadError title="Couldn't load these figures" onRetry={() => void query.refetch()} /> : null;
  }

  // Codes are data and keep their digits; only "and 3 more" is a count.
  const activeCodes = codesLine(stats.active.codes, translate, locale);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi size="sm" label="Active coupons" value={formatCount(stats.active.count, locale)} note={activeCodes} />
      <Kpi
        size="sm"
        label={translate("Used in {month}", { month: translate(month) })}
        value={formatCount(stats.usedThisMonth, locale)}
        note={countPhrase(translate, locale, stats.paymentsThisMonth, "Out of {count} payment", "Out of {count} payments")}
      />
      <Kpi size="sm" label="Money taken off" value={formatCurrency(stats.moneyOffThisMonth, undefined, 0)} note={translate("In {month}", { month: translate(month) })} />
      <Kpi
        size="sm"
        label="Most used ever"
        // Codes run to 32 characters: a long one is cut short, whole on
        // hover, without widening its column of the grid.
        className="min-w-0"
        value={
          stats.mostUsed ? (
            <span className="block truncate font-mono" title={stats.mostUsed.code}>
              {stats.mostUsed.code}
            </span>
          ) : (
            "—"
          )
        }
        note={stats.mostUsed ? countPhrase(translate, locale, stats.mostUsed.times, "{count} time", "{count} times") : "No coupon has been used yet"}
      />
    </div>
  );
};

export default CouponStats;
